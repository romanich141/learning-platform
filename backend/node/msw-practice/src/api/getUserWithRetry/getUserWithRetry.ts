const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getUserWithRetry = async (id: number, retries: number, delayMs: number) => {
  let attempts = retries;

  while (attempts > 0) {
    try {
      const response = await fetch(`https://api.example.com/users/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }

      const data: { id: string; name: string } = await response.json();

      return data;
    } catch (error) {
      attempts -= 1;

      if (attempts === 0) {
        if (error instanceof Error) {
          throw new Error(error.message);
        }
      }

      await delay(delayMs);
    }
  }
};
