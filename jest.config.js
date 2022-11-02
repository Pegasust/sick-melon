const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig');
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    setupFilesAfterEnv: ['./jest.setup.ts'],
    testPathIgnorePatterns: ['./.next/', './node_modules/'],
    moduleDirectories: ['node_modules', 'src'],
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
        prefix: '<rootDir>/'
    }),
    transform: {
        '^.+\\.(ts|tsx)?$': 'ts-jest',
        "^.+\\.(js|jsx)$": "babel-jest",
    }
};
