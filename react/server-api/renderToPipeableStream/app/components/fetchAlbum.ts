type Album = {
  id: string;
  title: string;
  seeds: number[];
  delayKey: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const ALBUMS: Album[] = [
  { id: "nature", title: "🌿 Природа", seeds: [10, 15, 16, 28], delayKey: "a" },
  { id: "city", title: "🏙️ Місто", seeds: [20, 29, 42, 48], delayKey: "b" },
  { id: "food", title: "🍜 Їжа", seeds: [312, 431, 493, 674], delayKey: "c" },
];

export const fetchAlbum = (id: string, opts: { delay: number }) => {
  let status = "pending";
  let result;

  const suspender = sleep(opts.delay)
    .then(() => {
      result = ALBUMS.find((album) => album.id === id);
      status = "success";
    })
    .catch((error) => {
      result = error;
      status = "error";
    });

  return {
    read() {
      if (status === "pending") {
        throw suspender;
      }

      if (status === "error") {
        throw result;
      }

      return result;
    },
  };
};
