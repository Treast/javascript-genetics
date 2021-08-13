importScripts('/assets/workerpool.min.js');

export interface IWorkerData {
  referenceImageData: Uint8ClampedArray;
  genes: any;
  width: number;
  height: number;
  ratio: number;
}

const computeFitness = (data: IWorkerData) => {
  const canvas = new OffscreenCanvas(data.width, data.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, data.width, data.height);

  for (let i = 0; i < data.genes.length; i += 1) {
    const gene = data.genes[i].value;
    const circleX = gene.x * data.width;
    const circleY = gene.y * data.height;
    const circleRadius = Math.round(gene.radius * (25 - 10) + 10);
    const circleR = gene.r;
    const circleG = gene.g;
    const circleB = gene.b;
    const circleA = gene.a;

    ctx.fillStyle = `rgba(${circleR * 255}, ${circleG * 255}, ${circleB * 255}, ${circleA})`;
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleRadius * data.ratio, 0, Math.PI * 2);
    ctx.fill();
  }

  const referenceImageData = data.referenceImageData;
  const rendererImageData = ctx.getImageData(0, 0, data.width, data.height).data;

  let difference: number = 0;

  for (let i = 0; i < referenceImageData.length; i += 1) {
    difference += Math.abs(referenceImageData[i] - rendererImageData[i]);
  }

  return difference * difference;
};

//@ts-ignore
workerpool.worker({
  computeFitness,
});
