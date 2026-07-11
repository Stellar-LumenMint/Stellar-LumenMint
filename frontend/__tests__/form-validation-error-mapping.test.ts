import { getValidationFieldMessage } from "@/utils/fetchUtils";

describe("Form Validation Field-Error Extractor Mapping", () => {
  it("should pull explicit validation messages via direct field indexing", () => {
    const nestedErrorObj = {
      validationErrors: {
        title: "The title field parameters are mandatory.",
        price: "Price metrics must evaluate above zero numerical constants.",
      },
    };

    const titleMessage = getValidationFieldMessage(nestedErrorObj, "title");
    const priceMessage = getValidationFieldMessage(nestedErrorObj, "price");

    expect(titleMessage).toBe("The title field parameters are mandatory.");
    expect(priceMessage).toBe(
      "Price metrics must evaluate above zero numerical constants.",
    );
  });

  it("should handle error arrays with string indexing fallbacks smoothly", () => {
    const arrayErrorObj = {
      validationErrors: {
        description: ["Description length validation limits breached."],
      },
    };

    const descMessage = getValidationFieldMessage(arrayErrorObj, "description");
    expect(descMessage).toBe("Description length validation limits breached.");
  });

  it("should traverse alternate array structures like [{ field, message }] to find matches", () => {
    const alternativeArrayObj = {
      errors: [
        {
          field: "email",
          message: "Provided address domain configuration is blocked.",
        },
        { path: "bannerImage", message: "Asset payload constraints exceeded." },
      ],
    };

    const emailMessage = getValidationFieldMessage(
      alternativeArrayObj,
      "email",
    );
    const bannerMessage = getValidationFieldMessage(
      alternativeArrayObj,
      "bannerImage",
    );

    expect(emailMessage).toBe(
      "Provided address domain configuration is blocked.",
    );
    expect(bannerMessage).toBe("Asset payload constraints exceeded.");
  });

  it("should gracefully yield undefined if requested key references don't exist", () => {
    const cleanObject = { validationErrors: { name: "Name error text" } };
    const unrelatedKeyMessage = getValidationFieldMessage(
      cleanObject,
      "unrelatedInputNode",
    );

    expect(unrelatedKeyMessage).toBeUndefined();
  });

  it("should handle primitive variables and null references cleanly without throwing crashes", () => {
    expect(getValidationFieldMessage(null, "email")).toBeUndefined();
    expect(getValidationFieldMessage(undefined, "email")).toBeUndefined();
    expect(
      getValidationFieldMessage("INTERNAL_SERVER_ERR_STRING", "email"),
    ).toBeUndefined();
  });
});
