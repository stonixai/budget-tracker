#!/usr/bin/env node

/**
 * Coverage validation script
 * Ensures all coverage thresholds are met with detailed reporting
 */

const fs = require('fs');
const path = require('path');

const COVERAGE_FILE = path.join(__dirname, '../coverage/coverage-summary.json');
const THRESHOLDS_FILE = path.join(__dirname, '../tests/config/coverage-thresholds.json');

function loadJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`❌ Error loading ${filePath}:`, error.message);
    process.exit(1);
  }
}

function checkThreshold(actual, threshold, metric, context) {
  const passed = actual >= threshold;
  const status = passed ? '✅' : '❌';
  const percentage = actual.toFixed(2);
  
  console.log(`${status} ${context} ${metric}: ${percentage}% (threshold: ${threshold}%)`);
  
  return passed;
}

function main() {
  console.log('\n🔍 Validating Test Coverage\n');

  // Load coverage data
  if (!fs.existsSync(COVERAGE_FILE)) {
    console.error('❌ Coverage file not found. Run tests with coverage first.');
    process.exit(1);
  }

  const coverage = loadJsonFile(COVERAGE_FILE);
  const thresholds = loadJsonFile(THRESHOLDS_FILE);

  let allPassed = true;

  // Check global coverage
  console.log('📊 Global Coverage:');
  const globalCoverage = coverage.total;
  
  for (const metric of ['branches', 'functions', 'lines', 'statements']) {
    const actual = globalCoverage[metric].pct;
    const threshold = thresholds.global[metric];
    const passed = checkThreshold(actual, threshold, metric, 'Global');
    allPassed = allPassed && passed;
  }

  // Check critical files coverage
  console.log('\n🔥 Critical Files Coverage (Financial Functions):');
  let criticalFilesCovered = 0;
  let totalCriticalFiles = 0;

  for (const [filePath, fileCoverage] of Object.entries(coverage)) {
    if (filePath === 'total') continue;
    
    const isCritical = thresholds.critical.files.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      return regex.test(filePath);
    });

    if (isCritical) {
      totalCriticalFiles++;
      console.log(`\n📁 ${filePath}:`);
      
      let filePassed = true;
      for (const metric of ['branches', 'functions', 'lines', 'statements']) {
        const actual = fileCoverage[metric].pct;
        const threshold = thresholds.critical[metric];
        const passed = checkThreshold(actual, threshold, metric, '  ');
        filePassed = filePassed && passed;
      }
      
      if (filePassed) {
        criticalFilesCovered++;
      }
      
      allPassed = allPassed && filePassed;
    }
  }

  console.log(`\n📈 Critical Files Summary: ${criticalFilesCovered}/${totalCriticalFiles} files meet 100% coverage requirement`);

  // Check API routes coverage
  console.log('\n🛠  API Routes Coverage:');
  let apiRoutesPassed = true;

  for (const [filePath, fileCoverage] of Object.entries(coverage)) {
    if (filePath === 'total') continue;
    
    const isApiRoute = thresholds.api.files.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      return regex.test(filePath);
    });

    if (isApiRoute) {
      console.log(`\n🔌 ${filePath}:`);
      
      for (const metric of ['branches', 'functions', 'lines', 'statements']) {
        const actual = fileCoverage[metric].pct;
        const threshold = thresholds.api[metric];
        const passed = checkThreshold(actual, threshold, metric, '  ');
        apiRoutesPassed = apiRoutesPassed && passed;
      }
    }
  }

  allPassed = allPassed && apiRoutesPassed;

  // Check uncovered lines
  console.log('\n📋 Uncovered Code Analysis:');
  let uncoveredLinesCount = 0;
  const uncoveredFiles = [];

  for (const [filePath, fileCoverage] of Object.entries(coverage)) {
    if (filePath === 'total') continue;
    
    const uncoveredLines = fileCoverage.lines.total - fileCoverage.lines.covered;
    if (uncoveredLines > 0) {
      uncoveredLinesCount += uncoveredLines;
      uncoveredFiles.push({
        path: filePath,
        uncovered: uncoveredLines,
        percentage: fileCoverage.lines.pct
      });
    }
  }

  if (uncoveredFiles.length > 0) {
    console.log(`⚠️  ${uncoveredLinesCount} total uncovered lines found in ${uncoveredFiles.length} files:`);
    uncoveredFiles
      .sort((a, b) => b.uncovered - a.uncovered)
      .slice(0, 10) // Show top 10 files with most uncovered lines
      .forEach(file => {
        console.log(`   ${file.path}: ${file.uncovered} lines (${file.percentage}% covered)`);
      });
  } else {
    console.log('🎉 Perfect coverage! No uncovered lines found.');
  }

  // Performance metrics
  console.log('\n⚡ Coverage Performance:');
  const totalStatements = globalCoverage.statements.total;
  const totalTests = Object.keys(coverage).length - 1; // Exclude 'total' key
  
  console.log(`📊 Total statements: ${totalStatements.toLocaleString()}`);
  console.log(`🧪 Total files with tests: ${totalTests}`);
  console.log(`📈 Average coverage: ${((globalCoverage.lines.pct + globalCoverage.branches.pct + globalCoverage.functions.pct + globalCoverage.statements.pct) / 4).toFixed(2)}%`);

  // Security check for test files
  console.log('\n🔒 Security Validation:');
  const testFiles = Object.keys(coverage).filter(path => 
    path.includes('/tests/') || path.includes('.test.') || path.includes('.spec.')
  );
  
  if (testFiles.length === 0) {
    console.log('✅ No test files included in production coverage (good!)');
  } else {
    console.log('⚠️  Test files found in coverage (should be excluded):');
    testFiles.forEach(file => console.log(`   ${file}`));
  }

  // Final result
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('🎉 ALL COVERAGE THRESHOLDS PASSED!');
    console.log('✅ Code quality gates satisfied');
    console.log('🚀 Ready for deployment');
  } else {
    console.log('❌ COVERAGE THRESHOLDS FAILED');
    console.log('🔧 Please add more tests to meet the required coverage');
    console.log('📚 Focus on critical financial functions and API routes');
  }
  console.log('='.repeat(60));

  process.exit(allPassed ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { main, checkThreshold, loadJsonFile };