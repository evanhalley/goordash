import { Command } from 'commander';
import { version, description } from '../package.json';

async function main(input, options) {
  console.debug('main');
}

(async() => {

  const program = new Command();

  program
    .version(version)
    .description(description);
    
  /*
  program
    .command('fm <input>')
    .description('Generates an image by parsing metadata from the frontmatter in the input file')
    .option('-o, --output <name and path to output>', 'Name and path of the output file, append with .jpg or .png')
    .option('-v, --verbose', 'Turns on verbose logging')
    .option(
      '-h, --html-template <path to the folder containing index.html>',
      'Path to index.html template used to generate your feature image',
    )
    .action((input, options) => processFrontmatterInput(input, options));
  **/
  program.action(async (input, options) => await main(input, options));

  try {
    program.parse(process.argv);
  } catch (error) {
    console.error(`\n >> Error ${error.message}`)
  }
})();