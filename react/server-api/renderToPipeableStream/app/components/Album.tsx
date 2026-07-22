import { FC } from "react";
import { fetchAlbum } from "./fetchAlbum";
import { LikeButton } from "./LikeButton";

type Props = { id: string; delay: number };

const cache = new Map();

export function getAlbum(id: string, delay: number) {
  if (!cache.has(id)) {
    cache.set(id, fetchAlbum(id, { delay }));
  }

  return cache.get(id);
}

export const resetCache = () => {
  cache.clear();
};

export const Album: FC<Props> = ({ id, delay }) => {
  const album = getAlbum(id, delay).read();

  return (
    <section key={album.id} className="album">
      <h2>{album.title}</h2>
      <div className="grid">
        {album.seeds.map((seed) => (
          <figure key={seed} className="photo">
            <img
              onClick={() => console.log(`Clicked photo ${seed}`)}
              fetchPriority="high"
              src={`https://picsum.photos/seed/${seed}/300/200`}
              alt={`photo ${seed}`}
              width={300}
              height={200}
              loading="lazy"
            />
            <LikeButton />
          </figure>
        ))}
      </div>
    </section>
  );
};
