import Chromosome from './Chromosome';
import Utils from './Utils';

export interface IRendererContext {
  ctx: CanvasRenderingContext2D | null;
  width: number;
  height: number;
}

export interface IGenomeState {
  generation: number;
  compliance: number;
  maxGeneration: number;
}

export interface ISize {
  height: number;
  width: number;
}

export interface ICanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

class Genome {
  private population: Chromosome[] = [];
  private populationSize: number;

  private sumFitness: number = 0;

  /**
   * Array of chromosome for selection & crossover
   */
  private bestChromosomes: Chromosome[] = [];
  private worstChromosomes: Chromosome[] = [];

  private mutationRate: number = 0.01;
  private selectionRate: number = 0.5;

  private renderer: ICanvas;
  private reference: ICanvas;

  private rendererSize: ISize;
  private computingSize: ISize;

  private state: IGenomeState = {
    generation: 0,
    compliance: 0,
    maxGeneration: 0,
  };

  public constructor(populationSize: number) {
    this.populationSize = populationSize;

    for (let i = 0; i < populationSize; i += 1) {
      this.population.push(new Chromosome());
    }

    const referenceCanvas = document.createElement('canvas');
    const rendererCanvas = document.createElement('canvas');

    this.reference = {
      canvas: referenceCanvas,
      ctx: referenceCanvas.getContext('2d'),
    };

    this.renderer = {
      canvas: rendererCanvas,
      ctx: rendererCanvas.getContext('2d'),
    };
  }

  public loadImage(imageSrc: string): Genome {
    const image = new Image();

    image.onload = () => {
      this.reference.ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, this.rendererSize.width, this.rendererSize.height);
    };

    image.src = imageSrc;

    return this;
  }

  public init(container: Element) {
    container.appendChild(this.reference.canvas);
    container.appendChild(this.renderer.canvas);
  }

  public setMutationRate(mutationRate: number) {
    this.mutationRate = mutationRate;
    return this;
  }

  public setSelectionRate(selectionRate: number) {
    this.selectionRate = selectionRate;
    return this;
  }

  public setRendererSize(rendererSize: ISize) {
    this.rendererSize = rendererSize;

    this.reference.canvas.width = rendererSize.width;
    this.reference.canvas.height = rendererSize.height;

    this.renderer.canvas.width = rendererSize.width;
    this.renderer.canvas.height = rendererSize.height;

    return this;
  }

  public setComputingSize(computingSize: ISize) {
    this.computingSize = computingSize;
    return this;
  }

  public getState() {
    return this.state;
  }

  public generate(numberOfGeneration: number = 1, callback: () => void = () => {}) {
    this.state.maxGeneration += numberOfGeneration;
    this.render(callback);
  }

  private generateGeneration() {
    this.state.generation += 1;

    this.computeFitness(); // + Sensible
    this.makeSelection(); // Peu probable
    this.makeCrossover(); //

    if (this.state.generation !== this.state.maxGeneration) this.makeMutation();
  }

  private computeFitness() {
    const offscreenCanvas = new OffscreenCanvas(this.computingSize.width, this.computingSize.height);
    const offscreenCtx = offscreenCanvas.getContext('2d');

    offscreenCtx.drawImage(this.reference.canvas, 0, 0, this.rendererSize.width, this.rendererSize.height);
    const imageData = offscreenCtx.getImageData(0, 0, this.computingSize.width, this.computingSize.height).data;

    this.population.forEach((chromosome) => {
      chromosome.computeFitnessByDifference(imageData, this.computingSize.width, this.computingSize.height);
    });
  }

  private makeSelection() {
    this.population.sort((a: Chromosome, b: Chromosome) => {
      return b.getFitness() - a.getFitness();
    });

    this.state.compliance = this.population[0].getFitness();

    const idx = Math.round(this.selectionRate * this.populationSize);

    this.bestChromosomes = this.population.slice(0, idx);
    this.worstChromosomes = this.population.slice(idx);

    this.sumFitness = 0;

    this.bestChromosomes.map((chromosome) => {
      this.sumFitness += chromosome.getFitness();
    });
  }

  private getRandomChromosome(selectedChromosomes: Chromosome[]) {
    const random = Math.random() * this.sumFitness;
    let sumFitness = 0;
    for (const chromosome of selectedChromosomes) {
      sumFitness += chromosome.getFitness();
      if (random < sumFitness) {
        return chromosome;
      }
    }
    return null;
  }

  /**
   * Pour chaque individu manquant, on sélectionne 2 individus et on fusionne leurs gènes
   */
  private makeCrossover() {
    let chromosomeA: Chromosome, chromosomeB: Chromosome;
    let chromosomeAIdx: number;
    let remainingChromosomes: Chromosome[] = [];
    let chromosomes1: number[], chromosomes2: number[], newChromosomes: number[], genes: number[], sliceIdx: number[];

    for (let i = 0; i < this.worstChromosomes.length; i += 1) {
      chromosomeA = this.getRandomChromosome(this.bestChromosomes);
      chromosomeAIdx = this.bestChromosomes.indexOf(chromosomeA);
      remainingChromosomes = [...this.bestChromosomes.slice(0, chromosomeAIdx), ...this.bestChromosomes.slice(chromosomeAIdx)];

      chromosomeB = this.getRandomChromosome(remainingChromosomes);

      chromosomes1 = chromosomeA.getGenesArray();
      chromosomes2 = chromosomeB.getGenesArray();

      const sliceIdx = Math.floor(Math.random() * chromosomes1.length);

      newChromosomes = [...chromosomes1.slice(0, sliceIdx), ...chromosomes2.slice(sliceIdx)];

      this.worstChromosomes[i].setGenes(newChromosomes);
    }
  }

  private makeMutation() {
    this.population.forEach((chromosome) => {
      chromosome.mutate(this.mutationRate);
    });
  }

  public render(callback: () => void) {
    this.renderer.ctx.fillStyle = '#000';
    this.renderer.ctx.fillRect(0, 0, this.renderer.canvas.width, this.renderer.canvas.height);

    this.generateGeneration();

    this.population[0].render(this.renderer.canvas);

    callback();

    if (this.state.generation < this.state.maxGeneration) requestAnimationFrame(() => this.render(callback));
  }
}

export default Genome;
