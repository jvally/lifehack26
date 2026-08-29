expect(result.passport.productId).toBe(product.id);
expect(result.evaluation.gaps[0].featureKey).toBe("weight");
expect(result.intelligence.category).toBe("running_shoes");