import{main as seed}from"./seed-synthetic-pilot";import{main as run}from"./run-synthetic-pilot";import{main as verify}from"./verify-synthetic-pilot";import{main as report}from"./report-synthetic-pilot";
export async function main(){await seed();await run();if(process.exitCode)throw new Error("SCENARIOS_FAILED");await verify();report()}
if(import.meta.url===`file://${process.argv[1]}`)main().catch(()=>{console.error("Ensaio técnico sintético falhou.");process.exitCode=1});
