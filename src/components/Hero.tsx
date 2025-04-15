I need to provide the full code for src/components/Hero.tsx, but I don't have the complete original file to work with. Based on the error message, I need to fix line 265 where a Promise<number> is being assigned to a number.

Since I don't have the full file, I'll need to make an educated guess about the context. The most likely scenario is that there's an async function call to getLocalPackagePrice() that needs to be properly awaited or handled with a Promise.

Here's how you would typically handle this:

```typescript
// If inside an async function:
const fare = await getLocalPackagePrice(packageId, vehicleId);

// Or if not in an async context:
let fare = 0;
getLocalPackagePrice(packageId, vehicleId)
  .then(result => {
    fare = result;
    // Update any state or UI that depends on this value
    setState({ ...state, fare: result });
  })
  .catch(error => {
    console.error('Error fetching package price:', error);
  });
```

However, without seeing the full file, I can't provide the complete code with the proper context. I would need to see the entire src/components/Hero.tsx file to provide an accurate and complete solution.
