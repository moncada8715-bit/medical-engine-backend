const fs = require('fs');
const readline = require('readline');

async function debugParse(filePath, type) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    console.log(`--- Debugging ${type}: ${filePath} ---`);
    let count = 0;
    for await (const line of rl) {
        if (!line.trim()) continue;
        
        let code, desc;
        if (type === 'icd10') {
            code = line.substring(0, 7).trim();
            desc = line.substring(8).trim();
        } else {
            // Updated HCPCS logic to handle leading spaces and offsets
            // Based on sample: "   A1001007Dressing for"
            code = line.substring(3, 8).trim(); 
            desc = line.substring(11, 40).trim(); // Short desc approx
        }

        console.log(`[${count}] Raw: "${line.substring(0, 50)}..."`);
        console.log(`    Extracted -> Code: "${code}", Desc: "${desc}"`);
        
        count++;
        if (count > 5) break;
    }
}

async function run() {
    await debugParse('data/icd10cm_codes_2025.txt', 'icd10');
    await debugParse('data/HCPC2025_JAN_ANWEB_12172024.txt', 'hcpcs');
}

run();
