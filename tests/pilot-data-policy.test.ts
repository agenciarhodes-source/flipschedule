import {describe,expect,it,vi} from "vitest";vi.mock("server-only",()=>({}));
import {isSyntheticPilotRuntime,resolvePilotDataMode,validateSyntheticClinicalInput} from "@/domains/pilot/data-policy";
const active={APP_ENV:"staging",PILOT_MODE:"true",PILOT_DATA_MODE:"SYNTHETIC_ONLY"};
describe("synthetic pilot data policy",()=>{
 it("is disabled outside the explicit staging pilot contract",()=>{expect(resolvePilotDataMode({APP_ENV:"production",PILOT_MODE:"true",PILOT_DATA_MODE:"SYNTHETIC_ONLY"})).toBe("DISABLED");expect(isSyntheticPilotRuntime({APP_ENV:"staging",PILOT_MODE:"false"})).toBe(false)});
 it("fails closed when staging pilot data mode is missing or unknown",()=>{expect(()=>resolvePilotDataMode({APP_ENV:"staging",PILOT_MODE:"true"})).toThrow("PILOT_SYNTHETIC_DATA_REQUIRED");expect(()=>resolvePilotDataMode({...active,PILOT_DATA_MODE:"REAL"})).toThrow("PILOT_SYNTHETIC_DATA_REQUIRED")});
 it("accepts marked clinical identities and example.test",()=>{expect(validateSyntheticClinicalInput({name:"Paciente Sintético 01",emailNormalized:"paciente01@example.test",phoneE164:null,cpf:null},active)).toBeTruthy()});
 it("does not classify internal UUIDs as phone numbers",()=>{expect(validateSyntheticClinicalInput({patientId:"00000000-0000-4000-8000-000000000500",clinicId:"00000000-0000-4000-8000-000000000010",title:"[SINTÉTICO] Orçamento",description:"[SINTÉTICO] Procedimento"},active)).toBeTruthy()});
 it.each([{name:"Pessoa"},{name:"Paciente Sintético",cpf:"000.000.000-00"},{name:"Lead Sintético",phoneE164:"+5500000000000"},{name:"Paciente Sintético",emailNormalized:"real@public.example.com"},{name:"Paciente Sintético",notes:"ligar para 11999999999"}])("rejects non-synthetic payload %#",payload=>{expect(()=>validateSyntheticClinicalInput(payload,active)).toThrow("PILOT_SYNTHETIC_DATA_REQUIRED")});
});
