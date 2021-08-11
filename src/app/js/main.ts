import App from './utils/App';
import Genome from './utils/genome.js/Genome';

const app = new App();

const IMAGE_WIDTH = 458;
const IMAGE_HEIGHT = 380;
const genome = new Genome(800, 20000).setMutationRate(0.3).setSelectionRate(0.4);

const buttonRun = document.querySelector('#buttonRun');
const roundSpan = document.querySelector('#informationRound span') as HTMLSpanElement;
const complianceSpan = document.querySelector('#informationCompliance span') as HTMLSpanElement;

app.isReady().then(() => {
  const referenceRef = document.querySelector('#reference') as HTMLCanvasElement;
  const rendererRef = document.querySelector('#renderer') as HTMLCanvasElement;

  initReference(referenceRef);
  initRenderer(rendererRef);

  buttonRun.addEventListener('click', (e: Event) => onButtonRunClick(e));
});

const initReference = (referenceRef: HTMLCanvasElement) => {
  const ctx = referenceRef.getContext('2d');

  referenceRef.width = IMAGE_WIDTH;
  referenceRef.height = IMAGE_HEIGHT;

  const painting = new Image();

  painting.onload = () => {
    console.log('Image loaded');
    ctx.drawImage(painting, 0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);

    genome.setReference(ctx);

    genome.compareToReference();
    showInformations();
  };

  painting.src = './assets/images/painting.jpg';
};

const initRenderer = (rendererRef: HTMLCanvasElement) => {
  rendererRef.width = IMAGE_WIDTH;
  rendererRef.height = IMAGE_HEIGHT;

  genome.setRenderer(rendererRef);
};

const onButtonRunClick = (e: Event) => {
  e.preventDefault();
  console.log('Running');

  genome.render(() => {
    showInformations();
  });
};

const showInformations = () => {
  roundSpan.innerText = `${genome.getState().round}`;
  complianceSpan.innerText = `${(genome.getState().compliance * 100).toFixed(2)}%`;
};
