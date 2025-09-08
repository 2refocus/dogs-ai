// test-pipeline.js
// Quick test of the improved Replicate pipeline

const { 
  buildReplicatePrompt, 
  getSuggestedAspect, 
  getAvailableStyles,
  aspectToCropRatio,
  cropRatioToAspect 
} = require('./lib/replicatePipeline.ts');

console.log("🎨 Testing Replicate Pipeline Integration\n");

// Test 1: Available styles
console.log("📋 Available Styles:");
getAvailableStyles().forEach(style => {
  const aspect = getSuggestedAspect(style);
  console.log(`  • ${style} → ${aspect}`);
});

console.log("\n");

// Test 2: Prompt building
const testCases = [
  { style: "Watercolor", crop: "4_5" },
  { style: "Oil Painting", crop: "3_4" },
  { style: "Photorealistic", crop: "1_1" },
  { style: "Anime", crop: "16_9" },
];

testCases.forEach(({ style, crop }) => {
  console.log(`🎯 Testing: ${style} (${crop})`);
  const prompt = buildReplicatePrompt({
    species: "dog",
    styleLabel: style,
    cropRatio: crop,
  });
  
  console.log(`   Aspect: ${cropRatioToAspect(crop)}`);
  console.log(`   Prompt: ${prompt.substring(0, 100)}...`);
  console.log("");
});

// Test 3: Aspect conversion
console.log("🔄 Aspect Conversion Tests:");
const aspects = ["1:1", "3:4", "4:5", "2:3", "16:9"];
aspects.forEach(aspect => {
  const crop = aspectToCropRatio(aspect);
  const back = cropRatioToAspect(crop);
  console.log(`  ${aspect} → ${crop} → ${back} ${aspect === back ? '✅' : '❌'}`);
});

console.log("\n✨ Pipeline test complete!");
