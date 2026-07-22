import { FC, Suspense } from "react";
import type { Query } from "../App.tsx";
import { Album } from "./Album.tsx";
import { ALBUMS } from "./fetchAlbum.ts";

type GalleryProps = { query: Query };

const getAlbumDelay = (delayKey: string, query: Query) => {
  return query[delayKey] ? parseInt(query[delayKey]) : 1000;
};

export const Gallery: FC<GalleryProps> = ({ query }) => {
  return (
    <main className="gallery">
      {ALBUMS.map((album) => (
        <Suspense key={album.id} fallback={<div>{`Loading album ${album.id}...`}</div>}>
          <Album id={album.id} delay={getAlbumDelay(album.delayKey, query)} />
        </Suspense>
      ))}
    </main>
  );
};
