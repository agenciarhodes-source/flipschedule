import {getReleaseMetadata} from "../lib/runtime/release";
export function releaseManifest(env:Record<string,string|undefined>=process.env){return JSON.stringify(getReleaseMetadata(env),null,2)+"\n"}
if(import.meta.url===`file://${process.argv[1]}`)process.stdout.write(releaseManifest());
