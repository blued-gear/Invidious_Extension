import type {Config} from '@jest/types';

const config: Config.InitialOptions = {
    verbose: true,
    testMatch: [
        "**/test/**/*.ts"
    ],
    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },
};
export default config;
