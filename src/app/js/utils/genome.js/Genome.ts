import Chromosome from './Chromosome';
import { IGene } from './Gene';

import * as workerpool from 'workerpool';
// @ts-ignore
import * as workerPath from 'file-loader?name=[name].js!./Worker';

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

  private pool: workerpool.WorkerPool;

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

    this.pool = workerpool.pool(workerPath, {
      minWorkers: 'max',
    });
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

  private generateGeneration(): Promise<void> {
    this.state.generation += 1;

    return this.computeFitness()
      .then(() => this.makeSelection())
      .then(() => this.makeCrossover())
      .then(() => this.makeMutation());
  }

  private computeFitness(): Promise<void> {
    return new Promise((resolve) => {
      const promises: Promise<number>[] = [];
      const offscreenCanvas = new OffscreenCanvas(this.computingSize.width, this.computingSize.height);
      const offscreenCtx = offscreenCanvas.getContext('2d');

      offscreenCtx.drawImage(
        this.reference.canvas,
        0,
        0,
        this.rendererSize.width,
        this.rendererSize.height,
        0,
        0,
        this.computingSize.width,
        this.computingSize.height
      );

      const imageData = offscreenCtx.getImageData(0, 0, this.computingSize.width, this.computingSize.height).data;

      const ratio: number = this.computingSize.width / this.rendererSize.width;

      this.population.forEach((chromosome) => {
        // chromosome.computeFitnessByDifference(imageData, this.computingSize.width, this.computingSize.height, ratio);
        promises.push(chromosome.computeFitnessByWorker(this.pool, imageData, this.computingSize.width, this.computingSize.height, ratio));
      });

      return Promise.all(promises).then(() => resolve());
    });
  }

  private makeSelection(): Promise<void> {
    return new Promise((resolve) => {
      this.population.sort((a: Chromosome, b: Chromosome) => {
        return a.getFitness() - b.getFitness();
      });

      this.state.compliance = this.population[0].getFitness();

      const idx = Math.round(this.selectionRate * this.populationSize);

      this.bestChromosomes = this.population.slice(0, idx);
      this.worstChromosomes = this.population.slice(idx);

      this.sumFitness = 0;

      this.bestChromosomes.map((chromosome) => {
        this.sumFitness += chromosome.getFitness();
      });

      resolve();
    });
  }

  private getRandomChromosome(selectedChromosomes: Chromosome[]) {
    const random = Math.floor(Math.random() * selectedChromosomes.length);
    return selectedChromosomes[random];
    // const random = Math.random() * this.sumFitness;
    // let sumFitness = 0;
    // for (const chromosome of selectedChromosomes) {
    //   sumFitness += chromosome.getFitness();
    //   if (random < sumFitness) {
    //     return chromosome;
    //   }
    // }
    // return null;
  }

  /**
   * Pour chaque individu manquant, on sélectionne 2 individus et on fusionne leurs gènes
   */
  private makeCrossover(): Promise<void> {
    return new Promise((resolve) => {
      let chromosomeA: Chromosome, chromosomeB: Chromosome;
      let remainingChromosomes: Chromosome[] = [];
      let chromosomes1: IGene[], chromosomes2: IGene[], newChromosomes: IGene[], genes: number[], sliceIdx: number[];

      chromosomeA = this.bestChromosomes[0];
      remainingChromosomes = [...this.bestChromosomes.slice(1)];

      for (let i = 0; i < this.worstChromosomes.length; i += 1) {
        chromosomeB = this.getRandomChromosome(remainingChromosomes);

        chromosomes1 = chromosomeA.getGenesArray().sort(() => 0.5 - Math.random());
        chromosomes2 = chromosomeB.getGenesArray().sort(() => 0.5 - Math.random());

        const sliceIdx = Math.floor(Math.random() * chromosomes1.length);

        newChromosomes = [...chromosomes1.slice(0, sliceIdx), ...chromosomes2.slice(sliceIdx)];

        this.worstChromosomes[i].setGenes(newChromosomes);
      }

      this.population = [...this.bestChromosomes, ...this.worstChromosomes];

      resolve();
    });
  }

  private makeMutation(): Promise<void> {
    return new Promise((resolve) => {
      this.population.forEach((chromosome) => {
        chromosome.mutate(this.mutationRate);
      });

      resolve();
    });
  }

  public async render(callback: () => void) {
    this.generateGeneration().then(() => {
      this.renderer.ctx.fillStyle = '#000';
      this.renderer.ctx.fillRect(0, 0, this.renderer.canvas.width, this.renderer.canvas.height);

      this.population[0].render(this.renderer.canvas);

      callback();

      if (this.state.generation < this.state.maxGeneration) requestAnimationFrame(() => this.render(callback));
    });
  }
}

export default Genome;
