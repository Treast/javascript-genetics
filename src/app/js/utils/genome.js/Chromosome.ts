import Gene from './Gene';
import { IRendererContext } from './Genome';
import Utils from './Utils';

const MIN_RADIUS = 8;
const MAX_RADIUS = 25;

/**
 * Genes: x, y, radius, r, g, b
 */
class Chromosome {
  private fitness: number = 0;
  private genes: Gene[] = [];

  public constructor(genes: number[] = []) {
    if (genes.length === 0) {
      for (let i = 0; i < 7; i += 1) {
        this.genes.push(new Gene());
      }
    } else {
      genes.forEach((gene) => {
        this.genes.push(new Gene(gene));
      });
    }
  }

  public getGenesArray(): number[] {
    return this.genes.slice(2).map((gene) => gene.get());
  }

  public setGenes(genes: number[]) {
    this.genes = this.genes.slice(0, 2);
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
  public computeFitness(referenceImageData: Uint8ClampedArray, rendererImageData: Uint8ClampedArray, width: number, height: number) {
    const sumDiffColors = [];

    const x = this.getX(width);
    const y = this.getY(height);

    sumDiffColors.push(this.computeFitnessAtPixel(x, y, referenceImageData, rendererImageData, width, height));

    for (let i = 0; i < this.getRadius(); i += 2) {
      for (let r = 0; r < Math.PI * 2; r += Math.PI / 6) {
        const diff = this.computeFitnessOnRadius(x, y, r, i, referenceImageData, rendererImageData, width, height);

        if (diff) sumDiffColors.push(diff);
      }
    }

    this.fitness = (sumDiffColors.reduce((acc, val) => acc + val) * this.clampRadius(this.getRadius())) / sumDiffColors.length;

    if (isNaN(this.fitness)) this.fitness = 0;

    return this.fitness;
  }

  private clampRadius(x: number): number {
    return this.map(Math.log(x), Math.log(MIN_RADIUS), Math.log(MAX_RADIUS), 1, 1.02);
  }

  private map(value: number, x1: number, y1: number, x2: number, y2: number) {
    return ((value - x1) * (y2 - x2)) / (y1 - x1) + x2;
  }

  private computeFitnessOnRadius(
    x: number,
    y: number,
    angle: number,
    radius: number,
    image1: Uint8ClampedArray,
    image2: Uint8ClampedArray,
    width: number,
    height: number
  ) {
    const newX = Math.floor(x + Math.cos(angle) * radius);
    const newY = Math.floor(y + Math.sin(angle) * radius);

    if (newX > 0 && newX < width && newY > 0 && newY < height) {
      return this.computeFitnessAtPixel(newX, newY, image1, image2, width, height);
    }

    return null;
  }

  private computeFitnessAtPixel(x: number, y: number, image1Data: Uint8ClampedArray, image2Data: Uint8ClampedArray, width: number, height: number) {
    const idx = (y * width + x) * 4;

    const r1 = image1Data[idx];
    const g1 = image1Data[idx + 1];
    const b1 = image1Data[idx + 2];

    const r2 = image2Data[idx];
    const g2 = image2Data[idx + 1];
    const b2 = image2Data[idx + 2];

    return Utils.compareColor(r1, g1, b1, r2, g2, b2);
  }

  public mutate(mutationRate: number) {
    if (Math.random() < mutationRate) {
      const idx = Math.floor(Math.random() * (this.genes.length - 2)) + 2;
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

  private getX(width: number): number {
    return Math.round(this.getGene(0) * width);
  }

  private getY(height: number): number {
    return Math.round(this.getGene(1) * height);
  }

  private getRadius(): number {
    return Math.round(this.getGene(2) * (MAX_RADIUS - MIN_RADIUS) + MIN_RADIUS);
  }

  private renderChromosome(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(${this.getGene(3) * 255}, ${this.getGene(4) * 255}, ${this.getGene(5) * 255}, ${this.getGene(6)})`;
    ctx.arc(this.getX(width), this.getY(height), this.getRadius(), 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    // ctx.fillStyle = '#f00';
    // ctx.fillRect(this.getX(width), this.getY(height), 2, 2);
  }
}

export default Chromosome;
