const fs = require('fs');
const path = require('path');

// Configuration
const BACKEND_DIR = path.resolve(__dirname);
const FRONTEND_DIR = path.resolve(__dirname, '../Frontend');

// Test results
const results = {
  tests: [],
  startTime: new Date().toISOString(),
  endTime: null,
  summary: {
    total: 0,
    passed: 0,
    failed: 0
  }
};

// Helper function to add test result
function addTestResult(name, status, details = '') {
  const result = {
    name,
    status,
    details,
    timestamp: new Date().toISOString()
  };
  
  results.tests.push(result);
  results.summary.total++;
  
  if (status === 'passed') {
    results.summary.passed++;
    console.log(`✅ ${name}`);
  } else {
    results.summary.failed++;
    console.log(`❌ ${name}: ${details}`);
  }
  
  return status === 'passed';
}

// Read package.json from directory
function readPackageJson(directory) {
  try {
    const packageJsonPath = path.join(directory, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return packageJson;
    }
  } catch (error) {
    console.error(`Error reading package.json from ${directory}:`, error.message);
  }
  return null;
}

// Check if required dependency exists
function checkDependency(packageJson, dependency) {
  if (!packageJson) return false;
  
  return !!(
    (packageJson.dependencies && packageJson.dependencies[dependency]) ||
    (packageJson.devDependencies && packageJson.devDependencies[dependency])
  );
}

// Verify dependencies alignment
function checkDependenciesAlignment() {
  const backendPackageJson = readPackageJson(BACKEND_DIR);
  const frontendPackageJson = readPackageJson(FRONTEND_DIR);
  
  if (!backendPackageJson || !frontendPackageJson) {
    return addTestResult('Dependencies Alignment', 'failed', 'Could not read package.json files');
  }
  
  // Check backend required dependencies
  const backendRequiredDeps = ['express', 'mongoose', 'cors'];
  const missingBackendDeps = backendRequiredDeps.filter(dep => !checkDependency(backendPackageJson, dep));
  
  if (missingBackendDeps.length > 0) {
    return addTestResult('Backend Dependencies', 'failed', `Missing dependencies: ${missingBackendDeps.join(', ')}`);
  } else {
    addTestResult('Backend Dependencies', 'passed');
  }
  
  // Check frontend required dependencies
  const frontendRequiredDeps = ['react', 'react-dom', 'react-router-dom'];
  const missingFrontendDeps = frontendRequiredDeps.filter(dep => !checkDependency(frontendPackageJson, dep));
  
  if (missingFrontendDeps.length > 0) {
    return addTestResult('Frontend Dependencies', 'failed', `Missing dependencies: ${missingFrontendDeps.join(', ')}`);
  } else {
    addTestResult('Frontend Dependencies', 'passed');
  }
  
  // Check testing dependencies
  const testingDeps = ['vitest', 'cypress', '@testing-library/react'];
  const missingTestingDeps = testingDeps.filter(dep => !checkDependency(frontendPackageJson, dep));
  
  if (missingTestingDeps.length > 0) {
    return addTestResult('Testing Dependencies', 'failed', `Missing dependencies: ${missingTestingDeps.join(', ')}`);
  } else {
    addTestResult('Testing Dependencies', 'passed');
  }
  
  return true;
}

// Check frontend API calls match backend routes
function checkAPIAlignment() {
  // Get backend router files
  const routesDir = path.join(BACKEND_DIR, 'routes');
  if (!fs.existsSync(routesDir)) {
    return addTestResult('API Routes Alignment', 'failed', 'Backend routes directory not found');
  }
  
  // Read all route files
  const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));
  
  // Extract routes
  const backendRoutes = [];
  
  for (const routeFile of routeFiles) {
    try {
      const routeContent = fs.readFileSync(path.join(routesDir, routeFile), 'utf8');
      
      // Extract route patterns (simple regex approach)
      const routePatterns = routeContent.match(/router\.(get|post|put|delete)\(['"]([^'"]+)['"]/g) || [];
      
      for (const pattern of routePatterns) {
        const matches = pattern.match(/router\.(get|post|put|delete)\(['"]([^'"]+)['"]/);
        if (matches && matches.length >= 3) {
          const method = matches[1].toUpperCase();
          const route = matches[2];
          backendRoutes.push({ method, route });
        }
      }
    } catch (error) {
      console.error(`Error reading route file ${routeFile}:`, error.message);
    }
  }
  
  // Get frontend API calls
  const frontendSrcDir = path.join(FRONTEND_DIR, 'src');
  if (!fs.existsSync(frontendSrcDir)) {
    return addTestResult('API Routes Alignment', 'failed', 'Frontend src directory not found');
  }
  
  // Function to recursively search files
  function searchFilesRecursively(dir, pattern) {
    let results = [];
    
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        results = results.concat(searchFilesRecursively(filePath, pattern));
      } else if (pattern.test(file)) {
        results.push(filePath);
      }
    }
    
    return results;
  }
  
  // Find JS/JSX files
  const frontendFiles = searchFilesRecursively(frontendSrcDir, /\.(js|jsx|ts|tsx)$/);
  
  // Extract API calls
  const frontendApiCalls = [];
  const apiUrlPatterns = [
    /fetch\(['"]([^'"]*api[^'"]*)['"]/g,
    /axios\.(get|post|put|delete)\(['"]([^'"]*api[^'"]*)['"]/g,
    /\.(get|post|put|delete)\(['"]([^'"]*api[^'"]*)['"]/g
  ];
  
  for (const file of frontendFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      for (const pattern of apiUrlPatterns) {
        const matches = content.match(pattern) || [];
        for (const match of matches) {
          if (match.includes('/api/')) {
            frontendApiCalls.push(match);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading frontend file ${file}:`, error.message);
    }
  }
  
  addTestResult('Backend Routes Detected', 'passed', `Found ${backendRoutes.length} routes`);
  addTestResult('Frontend API Calls Detected', 'passed', `Found ${frontendApiCalls.length} API calls`);
  
  // Basic alignment check: do we have routes and API calls?
  if (backendRoutes.length === 0) {
    return addTestResult('API Routes Alignment', 'failed', 'No backend routes detected');
  }
  
  if (frontendApiCalls.length === 0) {
    return addTestResult('API Routes Alignment', 'failed', 'No frontend API calls detected');
  }
  
  return addTestResult('API Routes Alignment', 'passed', 'Both backend routes and frontend API calls detected');
}

// Check for database models and frontend data structures alignment
function checkDataModelAlignment() {
  // Check backend models
  const modelsDir = path.join(BACKEND_DIR, 'models');
  if (!fs.existsSync(modelsDir)) {
    return addTestResult('Data Model Alignment', 'failed', 'Backend models directory not found');
  }
  
  // Get model files
  const modelFiles = fs.readdirSync(modelsDir).filter(file => file.endsWith('.js'));
  
  if (modelFiles.length === 0) {
    return addTestResult('Data Model Alignment', 'failed', 'No backend models found');
  }
  
  // Basic check for User and Score models
  const hasUserModel = modelFiles.some(file => file.toLowerCase().includes('user'));
  const hasScoreModel = modelFiles.some(file => file.toLowerCase().includes('score'));
  
  if (!hasUserModel) {
    addTestResult('User Model', 'failed', 'User model not found in backend');
  } else {
    addTestResult('User Model', 'passed');
  }
  
  if (!hasScoreModel) {
    addTestResult('Score Model', 'failed', 'Score model not found in backend');
  } else {
    addTestResult('Score Model', 'passed');
  }
  
  // Check frontend for matching types/interfaces
  const frontendTypesFiles = searchFilesRecursively(path.join(FRONTEND_DIR, 'src'), /\.(ts|tsx|js|jsx)$/);
  
  // Search for user/score types in frontend
  let foundUserType = false;
  let foundScoreType = false;
  
  for (const file of frontendTypesFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      if (content.includes('interface User') || 
          content.includes('type User') || 
          content.includes('User {') ||
          content.includes('user: {')) {
        foundUserType = true;
      }
      
      if (content.includes('interface Score') || 
          content.includes('type Score') || 
          content.includes('Score {') ||
          content.includes('score: {')) {
        foundScoreType = true;
      }
    } catch (error) {
      console.error(`Error reading frontend file ${file}:`, error.message);
    }
  }
  
  if (!foundUserType) {
    addTestResult('Frontend User Type', 'failed', 'User type/interface not found in frontend');
  } else {
    addTestResult('Frontend User Type', 'passed');
  }
  
  if (!foundScoreType) {
    addTestResult('Frontend Score Type', 'failed', 'Score type/interface not found in frontend');
  } else {
    addTestResult('Frontend Score Type', 'passed');
  }
  
  return true;
}

// Check test configuration alignment
function checkTestAlignment() {
  // Check if frontend tests exist
  const frontendTestDir = path.join(FRONTEND_DIR, 'src/test');
  let frontendTestsExist = fs.existsSync(frontendTestDir);
  
  // If not in the standard location, check for tests directory
  if (!frontendTestsExist) {
    frontendTestsExist = fs.existsSync(path.join(FRONTEND_DIR, 'tests')) || 
                         fs.existsSync(path.join(FRONTEND_DIR, '__tests__'));
  }
  
  if (!frontendTestsExist) {
    addTestResult('Frontend Tests', 'failed', 'No frontend tests directory found');
  } else {
    addTestResult('Frontend Tests', 'passed');
  }
  
  // Check if backend tests exist
  const backendTestsExist = fs.existsSync(path.join(BACKEND_DIR, 'tests')) || 
                            fs.existsSync(path.join(BACKEND_DIR, '__tests__')) ||
                            fs.readdirSync(BACKEND_DIR).some(file => file.startsWith('test-') && file.endsWith('.js'));
  
  if (!backendTestsExist) {
    addTestResult('Backend Tests', 'failed', 'No backend tests found');
  } else {
    addTestResult('Backend Tests', 'passed');
  }
  
  // Check for Cypress configuration
  const cypressConfigExists = fs.existsSync(path.join(FRONTEND_DIR, 'cypress.config.js')) ||
                              fs.existsSync(path.join(FRONTEND_DIR, 'cypress.json'));
  
  if (!cypressConfigExists) {
    addTestResult('Cypress Configuration', 'failed', 'No Cypress configuration found');
  } else {
    addTestResult('Cypress Configuration', 'passed');
  }
  
  // Check for test setup files
  const testSetupExists = fs.existsSync(path.join(FRONTEND_DIR, 'src/test/setup.ts')) ||
                          fs.existsSync(path.join(FRONTEND_DIR, 'src/test/setup.js'));
  
  if (!testSetupExists) {
    addTestResult('Test Setup', 'failed', 'No test setup file found');
  } else {
    addTestResult('Test Setup', 'passed');
  }
  
  return true;
}

// Function to recursively search files
function searchFilesRecursively(dir, pattern) {
  let results = [];
  
  if (!fs.existsSync(dir)) {
    return results;
  }
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    
    try {
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        results = results.concat(searchFilesRecursively(filePath, pattern));
      } else if (pattern.test(file)) {
        results.push(filePath);
      }
    } catch (error) {
      console.error(`Error accessing ${filePath}:`, error.message);
    }
  }
  
  return results;
}

// Generate and save report
function generateReport() {
  results.endTime = new Date().toISOString();
  results.summary.successRate = (results.summary.passed / results.summary.total * 100).toFixed(2) + '%';
  
  const reportFilename = `alignment-test-report-${Date.now()}.json`;
  fs.writeFileSync(path.join(__dirname, reportFilename), JSON.stringify(results, null, 2));
  
  console.log('\n====== TEST RESULTS ======');
  console.log(`Total tests: ${results.summary.total}`);
  console.log(`Passed: ${results.summary.passed}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Success rate: ${results.summary.successRate}`);
  console.log(`Report saved to: ${reportFilename}`);
}

// Main test function
async function runTests() {
  console.log('Starting Frontend-Backend Alignment Tests (Standalone Mode)...');
  
  try {
    // Step 1: Check dependencies alignment
    checkDependenciesAlignment();
    
    // Step 2: Check API routes alignment
    checkAPIAlignment();
    
    // Step 3: Check data model alignment
    checkDataModelAlignment();
    
    // Step 4: Check test configuration alignment
    checkTestAlignment();
  } catch (error) {
    console.error('Test suite error:', error.message);
  } finally {
    // Generate report
    generateReport();
  }
}

// Run tests
runTests(); 