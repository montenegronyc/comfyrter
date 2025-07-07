// Simple test to verify workflow generation
const { WorkflowConstructor } = require('./src/lib/workflow-constructor.ts');

// This is a basic test - in a real scenario you'd run this in the browser
console.log('Testing workflow generation...');

// Create a simple workflow
const constructor = new WorkflowConstructor();
const result = constructor.generateWorkflow('Generate a simple portrait');

console.log('Generated workflow structure:');
console.log('- Has version field:', 'version' in result.workflow);
console.log('- Version value:', result.workflow.version);
console.log('- Node count:', Object.keys(result.workflow).length - 1);
console.log('- First few node IDs:', Object.keys(result.workflow).slice(0, 5));

// Output a sample of the JSON structure
console.log('\nSample workflow JSON structure:');
console.log(JSON.stringify(result.workflow, null, 2).substring(0, 500) + '...');