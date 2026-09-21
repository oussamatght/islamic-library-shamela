import 'dotenv/config';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(compression());
app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ status: 'ok', service: 'shamela-api' });
});

app.listen(port, () => {
  console.log(`Shamela API listening on http://localhost:${port}`);
});
