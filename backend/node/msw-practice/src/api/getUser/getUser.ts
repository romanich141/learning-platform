export const getUser = async (id: number) => {
  try {
    const response = await fetch(`https://api.example.com/users/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch user");
    }

    const data: { id: string; name: string } = await response.json();

    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message);
      throw new Error(error.message);
    }
  }
};
