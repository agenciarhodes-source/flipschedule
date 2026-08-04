import "server-only";
import { createHash } from "node:crypto";
import { readdirSync,readFileSync } from "node:fs";
import { join } from "node:path";
import { getRuntimeEnvironment } from "./config";
const safe=(value:string|undefined,max:number,pattern:RegExp)=>value&&value.length<=max&&pattern.test(value)?value:undefined;
export type ReleaseMetadata={environment:string;commitSha:string|null;releaseId:string|null;buildTimestamp:string|null;migrationsDigest:string;applicationVersion:string};
export function migrationsDigest(root=join(process.cwd(),"prisma/migrations")){const hash=createHash("sha256");for(const name of readdirSync(root).sort()){const file=join(root,name,"migration.sql");try{hash.update(name).update("\0").update(readFileSync(file))}catch{}}return hash.digest("hex")}
export function getReleaseMetadata(env:Record<string,string|undefined>=process.env):ReleaseMetadata{return {environment:getRuntimeEnvironment(env),commitSha:safe(env.BUILD_SHA??env.VERCEL_GIT_COMMIT_SHA,64,/^[a-f0-9]+$/i)??null,releaseId:safe(env.RELEASE_ID,80,/^[a-zA-Z0-9._-]+$/)??null,buildTimestamp:safe(env.BUILD_TIMESTAMP,40,/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/)??null,migrationsDigest:migrationsDigest(),applicationVersion:process.env.npm_package_version??"0.1.0"}}
