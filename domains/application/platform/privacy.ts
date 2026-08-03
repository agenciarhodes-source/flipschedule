export function maskEmail(value:string){const [local="",domain=""]=value.split("@");return `${local.slice(0,1)}***@${domain.slice(0,1)}***${domain.includes(".")?`.${domain.split(".").pop()}`:""}`}
export const sanitizeErrorCode=(value:unknown)=>typeof value==="string"&&/^[A-Z0-9_]{1,80}$/.test(value)?value:"OPERATION_FAILED";
