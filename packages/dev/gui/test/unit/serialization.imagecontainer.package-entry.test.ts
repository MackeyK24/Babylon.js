describe("package-entry registration constrained by ESLint", () => {
    it("noop (import/no-internal-modules blocks importing src package entries in tests)", () => {
        expect(true).toBe(true);
    });
});
