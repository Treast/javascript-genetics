import Chromosome from './Chromosome';
import Utils from './Utils';

export interface IRendererContext {
  ctx: CanvasRenderingContext2D | null;
  width: number;
  height: number;
}

export interface IGenomeState {
  round: number;
  compliance: number;
}

class Genome {
  private population: Chromosome[] = [];
  private round: number = 0;
  private maxRound: number;
  private size: number;

  private sumFitness: number = 0;

  /**
   * Array of chromosome for selection & crossover
   */
  private bestChromosomes: Chromosome[] = [];
  private worstChromosomes: Chromosome[] = [];

  private mutationRate: number = 0.5;
  private selectionRate: number = 0.5;

  private rendererCtx: HTMLCanvasElement;

  private scaleReferenceImage: HTMLCanvasElement;
  private scaleReferenceContext: CanvasRenderingContext2D;

  private scale: number = 1;

  private genomeState: IGenomeState = {
    round: 0,
    compliance: 0,
  };

  public referenceImage: HTMLCanvasElement | null = null;

  public constructor(size: number, maxRound: number) {
    this.maxRound = maxRound;
    this.size = size;

    for (let i = 0; i < size; i += 1) {
      this.population.push(new Chromosome());
    }

    this.scaleReferenceImage = document.createElement('canvas');
    this.scaleReferenceContext = this.scaleReferenceImage.getContext('2d');
  }

  public setMutationRate(mutationRate: number) {
    this.mutationRate = mutationRate;
    return this;
  }

  public setSelectionRate(selectionRate: number) {
    this.selectionRate = selectionRate;
    return this;
  }

  public setScale(scale: number) {
    this.scale = scale;

    if (this.referenceImage) this.setScaleImage();

    return this;
  }

  public setRenderer(rendererCtx: HTMLCanvasElement) {
    this.rendererCtx = rendererCtx;
  }

  public setScaleImage() {
    this.scaleReferenceImage.width = this.referenceImage.width * this.scale;
    this.scaleReferenceImage.height = this.referenceImage.height * this.scale;

    this.scaleReferenceContext.drawImage(this.referenceImage, 0, 0, this.referenceImage.width * this.scale, this.referenceImage.height * this.scale);
  }

  public setReference(referenceImage: HTMLCanvasElement) {
    this.referenceImage = referenceImage;
    this.setScaleImage();
  }

  public getState() {
    return this.genomeState;
  }

  public runRounds(cb: () => void) {
    for (let i = 0; i < this.maxRound; i += 1) {
      this.run();
      cb();
    }
  }

  public run() {
    this.genomeState.round += 1;

    this.computeFitness();
    this.makeSelection();
    this.makeCrossover();

    if (this.genomeState.round !== this.maxRound) this.makeMutation();
  }

  private computeFitness() {
    if (this.rendererCtx) {
      const image1Data = this.scaleReferenceContext.getImageData(0, 0, this.scaleReferenceImage.width, this.scaleReferenceImage.height).data;

      this.population.forEach((chromosome) => {
        if (this.referenceImage) {
          chromosome.computeFitness(image1Data, this.scaleReferenceImage.width, this.scaleReferenceImage.height);
        }
      });
    }
  }

  private makeSelection() {
    this.population.sort((a: Chromosome, b: Chromosome) => {
      return b.getFitness() - a.getFitness();
    });

    this.genomeState.compliance = this.population[0].getFitness();

    const idx = Math.round(this.selectionRate * this.size);

    this.bestChromosomes = this.population.slice(0, idx);
    this.worstChromosomes = this.population.slice(idx);

    this.sumFitness = 0;

    this.bestChromosomes.map((chromosome) => {
      this.sumFitness += chromosome.getFitness();
    });
  }

  getRandomChromosome(selectedChromosomes: Chromosome[]) {
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

      genes = [...chromosomes1];
      sliceIdx = genes
        .sort(() => {
          return 0.5 - Math.random();
        })
        .slice(0, 2)
        .map((gene: number) => {
          return chromosomes1.indexOf(gene);
        });

      newChromosomes = [...chromosomes1.slice(0, sliceIdx[0]), ...chromosomes2.slice(sliceIdx[0], sliceIdx[1]), ...chromosomes1.slice(sliceIdx[1])];

      this.worstChromosomes[i].setGenes(newChromosomes);
    }
  }

  private makeMutation() {
    this.population.forEach((chromosome) => {
      chromosome.mutate(this.mutationRate);
    });
  }

  public render(cb: () => void) {
    const ctx = this.rendererCtx.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.rendererCtx.width, this.rendererCtx.height);

    this.run();

    this.population[0].render(this.rendererCtx);

    cb();

    if (this.genomeState.round < this.maxRound) requestAnimationFrame(() => this.render(cb));
  }
}

export default Genome;
