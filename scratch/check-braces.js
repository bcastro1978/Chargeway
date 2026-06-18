const fs = require('fs');

const content = fs.readFileSync('src/app/page.tsx', 'utf8');

let braces = 0;
let parens = 0;
let brackets = 0;

const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{') braces++;
    else if (char === '}') braces--;
    else if (char === '(') parens++;
    else if (char === ')') parens--;
    else if (char === '[') brackets++;
    else if (char === ']') brackets--;

    if (braces < 0) {
      console.log(`Extra closing brace } at line ${i + 1}:${j + 1}`);
      braces = 0;
    }
    if (parens < 0) {
      console.log(`Extra closing parenthesis ) at line ${i + 1}:${j + 1}`);
      parens = 0;
    }
    if (brackets < 0) {
      console.log(`Extra closing bracket ] at line ${i + 1}:${j + 1}`);
      brackets = 0;
    }
  }
}

console.log(`Final counts - Braces: ${braces}, Parens: ${parens}, Brackets: ${brackets}`);
