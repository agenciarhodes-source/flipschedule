import {validateRuntimeConfiguration} from "../lib/runtime/config";
const result=validateRuntimeConfiguration();if(!result.valid){console.error(`Preflight bloqueado: ${result.issues.join(", ")}`);process.exitCode=1}else console.info(`Preflight válido para ${result.environment}; nenhuma conexão externa foi realizada.`);
