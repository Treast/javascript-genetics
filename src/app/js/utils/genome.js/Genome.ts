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

  private bestIterationSoFar: Chromosome[] = [];
  private bestIterationCompliance: number = -1;

  private genomeState: IGenomeState = {
    round: 0,
    compliance: 0,
  };

  public referenceImage: CanvasRenderingContext2D | null = null;

  public constructor(size: number, maxRound: number) {
    this.maxRound = maxRound;
    this.size = size;

    for (let i = 0; i < size; i += 1) {
      this.population.push(new Chromosome());
    }
  }

  public setMutationRate(mutationRate: number) {
    this.mutationRate = mutationRate;
    return this;
  }

  public setSelectionRate(selectionRate: number) {
    this.selectionRate = selectionRate;
    return this;
  }

  public setRenderer(rendererCtx: HTMLCanvasElement) {
    this.rendererCtx = rendererCtx;
  }

  public setReference(referenceImage: CanvasRenderingContext2D) {
    this.referenceImage = referenceImage;
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
      const sumFitness: number[] = [];

      const image1Data = this.referenceImage.getImageData(0, 0, this.rendererCtx.width, this.rendererCtx.height).data;
      const image2Data = this.rendererCtx.getContext('2d').getImageData(0, 0, this.rendererCtx.width, this.rendererCtx.height).data;

      this.population.forEach((chromosome) => {
        if (this.referenceImage) {
          const fitness = chromosome.computeFitness(image1Data, image2Data, this.rendererCtx.width, this.rendererCtx.height);
          sumFitness.push(fitness);
        }
      });

      this.compareToReference();
    }
  }

  public compareToReference() {
    const image1Data = this.referenceImage.getImageData(0, 0, this.rendererCtx.width, this.rendererCtx.height).data;
    const image2Data = this.rendererCtx.getContext('2d').getImageData(0, 0, this.rendererCtx.width, this.rendererCtx.height).data;

    const differences = [];

    for (let x = 0; x < this.rendererCtx.width; x += 5) {
      for (let y = 0; y < this.rendererCtx.height; y += 5) {
        const idx = (y * this.rendererCtx.width + x) * 4;

        const r1 = image1Data[idx];
        const g1 = image1Data[idx + 1];
        const b1 = image1Data[idx + 2];

        const r2 = image2Data[idx];
        const g2 = image2Data[idx + 1];
        const b2 = image2Data[idx + 2];

        // console.log(r1, g1, b1, r2, g2, b2, Utils.compareColor(r1, g1, b1, r2, g2, b2));

        differences.push(Utils.compareColorStrict(r1, g1, b1, r2, g2, b2));
      }
    }

    const compliance = differences.reduce((acc, val) => acc + val) / differences.length;

    if (compliance < this.bestIterationCompliance) {
      this.population = [...this.bestIterationSoFar];
      this.genomeState.compliance = this.bestIterationCompliance;
    } else {
      this.genomeState.compliance = compliance;
      this.bestIterationSoFar = [...this.population];
      this.bestIterationCompliance = compliance;
    }
  }

  private makeSelection() {
    this.population.sort((a: Chromosome, b: Chromosome) => {
      return b.getFitness() - a.getFitness();
    });

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
    for (let i = 0; i < this.worstChromosomes.length; i += 1) {
      const worstChromosome: Chromosome = this.worstChromosomes[i];

      let chromosomeA, chromosomeB;

      do {
        chromosomeA = this.getRandomChromosome(this.bestChromosomes);
        chromosomeB = this.getRandomChromosome(this.bestChromosomes);
      } while (!chromosomeA || !chromosomeB || chromosomeA === chromosomeB);

      const chromosomes1 = chromosomeA.getGenesArray();
      const chromosomes2 = chromosomeB.getGenesArray();

      const sliceIdx: number[] = [-1, -1];

      do {
        sliceIdx[0] = Math.floor(Math.random() * (chromosomes1.length - 2) + 1);
        sliceIdx[1] = Math.floor(Math.random() * (chromosomes1.length - 2) + 1);
      } while (sliceIdx[0] === -1 || sliceIdx[1] === -1 || sliceIdx[0] === sliceIdx[1]);

      sliceIdx.sort();

      const newChromosomes = [
        ...chromosomes1.slice(0, sliceIdx[0]),
        ...chromosomes2.slice(sliceIdx[0], sliceIdx[1]),
        ...chromosomes1.slice(sliceIdx[1]),
      ];

      worstChromosome.setGenes(newChromosomes);
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

    for (let i = 0; i < this.population.length; i += 1) {
      this.population[i].render(this.rendererCtx);
    }

    // for (let i = 0; i < 100; i += 1) {
    // }
    this.run();
    cb();

    if (this.genomeState.round < this.maxRound) requestAnimationFrame(() => this.render(cb));
  }
}

export default Genome;
