import { describe, expect, it } from "vitest";
import { parseNominatimAddress } from "@/lib/field-force/parse-nominatim-address";

describe("parseNominatimAddress", () => {
  it("maps nominatim fields into building, street, area, district, and state", () => {
    const parsed = parseNominatimAddress({
      display_name: "123, Main Road, MVP Colony, Visakhapatnam, Andhra Pradesh, India",
      address: {
        house_number: "123",
        road: "Main Road",
        suburb: "MVP Colony",
        city: "Visakhapatnam",
        state: "Andhra Pradesh",
        postcode: "530017",
      },
    });

    expect(parsed.building).toBe("123");
    expect(parsed.street).toBe("Main Road");
    expect(parsed.area).toBe("MVP Colony");
    expect(parsed.district).toBe("Visakhapatnam");
    expect(parsed.state).toBe("Andhra Pradesh");
    expect(parsed.formatted).toContain("Andhra Pradesh");
  });

  it("prioritises quarter and suburb for Indian locality names like Chinna Waltair", () => {
    const parsed = parseNominatimAddress({
      display_name:
        "Vijayanagar Police Layout, Chinna Waltair, Pedda Waltair, Visakhapatnam, Andhra Pradesh, 530001, India",
      address: {
        neighbourhood: "Vijayanagar Police Layout",
        quarter: "Chinna Waltair",
        suburb: "Pedda Waltair",
        city: "Visakhapatnam",
        state_district: "Visakhapatnam",
        state: "Andhra Pradesh",
        postcode: "530001",
      },
    });

    expect(parsed.locality).toBe("Vijayanagar Police Layout");
    expect(parsed.area).toBe("Chinna Waltair, Pedda Waltair");
    expect(parsed.district).toBe("Visakhapatnam");
    expect(parsed.state).toBe("Andhra Pradesh");
  });
});
