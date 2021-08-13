import Gene, { IGene } from './Gene';
import GPUComputing from './GPUComputing';
import Utils from './Utils';
import * as workerpool from 'workerpool';

/**
 * To refactor
 */
const MIN_RADIUS = 10;
const MAX_RADIUS = 25;

const NUMBER_CIRCLE = 500;
const NUMBER_ARGUMENTS_BY_CIRCLE = 7;

/**
 * Genes: x, y, radius, r, g, b, alpha
 */
class Chromosome {
  private fitness: number = 0;
  private genes: Gene[] = [];

  private offscreenCanvas: OffscreenCanvas;
  private offscreenCtx: OffscreenCanvasRenderingContext2D;

  public constructor(genes: IGene[] = []) {
    if (genes.length === 0) {
      for (let i = 0; i < NUMBER_CIRCLE; i += 1) {
        this.genes.push(new Gene());
      }
    } else {
      genes.forEach((gene: IGene) => {
        this.genes.push(new Gene(gene));
      });
    }
  }

  public getGenesArray(): IGene[] {
    return this.genes.map((gene) => gene.get());
  }

  public setGenes(genes: IGene[]) {
    this.genes = [];

    genes.map((gene) => {
      this.genes.push(new Gene(gene));
    });
  }

  /**
   *
   * Comparaison de la couleur, en commençant par le centre, puis 4 px dans chaque direction
   * tout qu'on se trouve dans le cercle
   *
   * @param referenceImage
   * @param canvas
   */
  public computeFitnessByDifferenceGPU(referenceImageData: Uint8ClampedArray, width: number, height: number, ratio: number) {
    this.offscreenCanvas = new OffscreenCanvas(width, height);
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');

    this.renderChromosome(this.offscreenCtx, width, height, ratio);

    const rendererImageData = this.offscreenCtx.getImageData(0, 0, width, height).data;

    const matricesResult = GPUComputing.getKernel()(referenceImageData, rendererImageData) as number[];
    let difference: number = matricesResult[0];

    this.fitness = 1 - difference / referenceImageData.length;

    return this.fitness;
  }

  public computeFitnessByDifference(referenceImageData: Uint8ClampedArray, width: number, height: number, ratio: number) {
    this.offscreenCanvas = new OffscreenCanvas(width, height);
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');

    this.renderChromosome(this.offscreenCtx, width, height, ratio);

    const rendererImageData = this.offscreenCtx.getImageData(0, 0, width, height).data;

    let difference: number = 0;

    for (let i = 0; i < referenceImageData.length; i += 1) {
      difference += Math.abs(rendererImageData[i] - referenceImageData[i]);
    }

    this.fitness = 1 - difference / (referenceImageData.length * 255);

    return this.fitness;
  }

  public computeFitnessByWorker(
    pool: workerpool.WorkerPool,
    referenceImageData: Uint8ClampedArray,
    width: number,
    height: number,
    ratio: number
  ): Promise<number> {
    return new Promise((resolve) => {
      pool
        .exec('computeFitness', [
          {
            genes: this.genes,
            referenceImageData,
            width,
            height,
            ratio,
          },
        ])
        .then((fitness) => {
          this.fitness = fitness;
          resolve(this.fitness);
        });
    });
  }

  public computeFitness(referenceImageData: Uint8ClampedArray, width: number, height: number) {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    this.renderChromosome(ctx, width, height);

    const rendererImageData = ctx.getImageData(0, 0, width, height).data;

    const differences = [];

    for (let x = 0; x < width; x += 1) {
      for (let y = 0; y < height; y += 1) {
        const idx = (y * width + x) * 4;

        const r1 = referenceImageData[idx];
        const g1 = referenceImageData[idx + 1];
        const b1 = referenceImageData[idx + 2];

        const r2 = rendererImageData[idx];
        const g2 = rendererImageData[idx + 1];
        const b2 = rendererImageData[idx + 2];

        differences.push(Utils.compareColor(r1, g1, b1, r2, g2, b2));
      }
    }

    this.fitness = differences.reduce((acc, val) => acc + val) / differences.length;

    if (isNaN(this.fitness)) this.fitness = 0;

    return this.fitness;
  }

  public mutate(mutationRate: number) {
    if (Math.random() < mutationRate) {
      const idx = Math.floor(Math.random() * this.genes.length);
      this.genes[idx] = new Gene();
    }
  }

  public getGene(idx: number) {
    return this.genes[idx].get();
  }

  public getFitness(): number {
    return this.fitness;
  }

  public render(rendererCtx: HTMLCanvasElement) {
    const ctx = rendererCtx.getContext('2d');
    this.renderChromosome(ctx, rendererCtx.width, rendererCtx.height);
  }

  private getCircle(idx: number) {
    return this.genes.slice(idx * NUMBER_ARGUMENTS_BY_CIRCLE, (idx + 1) * NUMBER_ARGUMENTS_BY_CIRCLE);
  }

  public getCircleGene(circleIdx: number, geneIdx: number) {
    return this.genes[circleIdx * NUMBER_ARGUMENTS_BY_CIRCLE + geneIdx].get();
  }

  public renderChromosome(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number, ratio: number = 1) {
    for (let i = 0; i < NUMBER_CIRCLE; i += 1) {
      const gene = this.getGene(i);
      const circleX = gene.x * width;
      const circleY = gene.y * height;
      const circleRadius = Math.round(gene.radius * (MAX_RADIUS - MIN_RADIUS) + MIN_RADIUS);
      const circleR = gene.r;
      const circleG = gene.g;
      const circleB = gene.b;
      const circleA = gene.a;

      ctx.fillStyle = `rgba(${circleR * 255}, ${circleG * 255}, ${circleB * 255}, ${circleA})`;
      ctx.beginPath();
      ctx.arc(circleX, circleY, circleRadius * ratio, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export default Chromosome;
