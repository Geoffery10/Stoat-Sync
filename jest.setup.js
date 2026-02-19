import dotenv from 'dotenv';
dotenv.config({ quiet: true });

module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'], // Customize as needed
};
