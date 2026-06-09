import * as dotenv from 'dotenv';
dotenv.config();

export default () => {
  const nodeEnv: string = process.env.NODE_ENV || 'local';

  const feUrl = process.env.FE_URL;
  return {
    debug: process.env.DEBUG === 'true',
    env: nodeEnv,
    nodeEnv,
    feUrl: feUrl,
    port: process.env.PORT || 3001,
    deepseek: {
      DS_KEY: process.env.DS_KEY,
    },
  };
};
