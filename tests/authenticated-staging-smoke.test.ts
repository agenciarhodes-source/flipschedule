import {describe,expect,it} from "vitest";
import {assertSameOriginRedirect,assertSessionCookie,assertSyntheticPilotBanner,SYNTHETIC_PILOT_BANNER_MARKER} from "@/scripts/ops-authenticated-staging-smoke";
describe("authenticated staging smoke guards",()=>{
 it("requires secure HttpOnly cookie",()=>{expect(assertSessionCookie("session=opaque; Path=/; Secure; HttpOnly; SameSite=Lax")).toBe("session=opaque");expect(()=>assertSessionCookie("session=secret; Secure")).toThrow()});
 it("allows only same-origin redirects",()=>{const base=new URL("https://staging.example.test");expect(assertSameOriginRedirect(base,"/login").origin).toBe(base.origin);expect(()=>assertSameOriginRedirect(base,"https://production.example.test")).toThrow()});
 it("requires the synthetic pilot banner rather than generic staging only",()=>{expect(()=>assertSyntheticPilotBanner("AMBIENTE DE HOMOLOGAÇÃO — USE APENAS DADOS FICTÍCIOS")).toThrow("SMOKE_PILOT_BANNER_MISSING");expect(()=>assertSyntheticPilotBanner(`AMBIENTE DE HOMOLOGAÇÃO — ${SYNTHETIC_PILOT_BANNER_MARKER}`)).not.toThrow()});
});
