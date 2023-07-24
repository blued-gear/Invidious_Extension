import type {Config} from '@jest/types';

const config: Config.InitialOptions = {
    verbose: true,
    testMatch: [
        "**/test/**/*.ts"
    ],
    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },
    setupFilesAfterEnv: [
        "jest-expect-message"
    ]
};
export default config;
