import Gene from './Gene';
import { IRendererContext } from './Genome';
import Utils from './Utils';

const MIN_RADIUS = 8;
const MAX_RADIUS = 25;

const NUMBER_CIRCLE = 400;
const NUMBER_ARGUMENTS_BY_CIRCLE = 7;

/**
 * Genes: x, y, radius, r, g, b, alpha
 */
class Chromosome {
  private fitness: number = 0;
  private genes: Gene[] = [];

  public constructor(genes: number[] = []) {
    if (genes.length === 0) {
      for (let i = 0; i < NUMBER_CIRCLE * NUMBER_ARGUMENTS_BY_CIRCLE; i += 1) {
        this.genes.push(new Gene());
      }
    } else {
      genes.forEach((gene) => {
        this.genes.push(new Gene(gene));
      });
    }
  }

  public getGenesArray(): number[] {
    return this.genes.map((gene) => gene.get());
  }

  public setGenes(genes: number[]) {
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

  private renderChromosome(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number) {
    for (let i = 0; i < NUMBER_CIRCLE; i += 1) {
      const circleX = this.getCircleGene(i, 0) * width;
      const circleY = this.getCircleGene(i, 1) * height;
      const circleRadius = Math.round(this.getCircleGene(i, 2) * (MAX_RADIUS - MIN_RADIUS) + MIN_RADIUS);
      const circleR = this.getCircleGene(i, 3);
      const circleG = this.getCircleGene(i, 4);
      const circleB = this.getCircleGene(i, 5);
      const circleA = this.getCircleGene(i, 6);

      ctx.beginPath();
      ctx.fillStyle = `rgba(${circleR * 255}, ${circleG * 255}, ${circleB * 255}, ${circleA})`;
      ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }
  }
}

export default Chromosome;
