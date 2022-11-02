import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { signIn, signOut, useSession } from "next-auth/react";

import { trpc } from "@utils/trpc";
import { NavbarLayout } from "@components/navbar";
import { FormEventHandler, ReactElement, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useZorm } from "react-zorm";
import { SearchBar } from "@components/search_bar";
import { MelonBackground } from "@components/melon_background";
import { cva } from "class-variance-authority";
import { FreeImageHost } from "@/types/extern_api_schema";
import { clientEnv } from "@/env/schema.mjs";

const cva_input_text = cva([], {
  variants: {
    intent: {
      primary: ["rounded-md"]
    },
    size: {
      medium: ["px-2", "py-1", "text-base"]
    },
    isRequired: {
      required: ["border-2"],
      not: ["border"],
    },
    hasError: {
      errored: ["border-red-700"],
      error: ["border-red-300"],
      none: []
    },
    visibility: {
      visible: [],
      hidden: ["hidden"]
    }
  },
  defaultVariants: {
    intent: "primary",
    size: "medium",
    isRequired: "not",
    hasError: "none",
    visibility: "visible"
  }
});

const RelaxedDate = z.union([
  z.string().transform((e) => {
    const timestamp = Date.parse(e);
    if (isNaN(timestamp)) { return undefined; }
    return new Date(timestamp);
  }),
  z.date()
]);


export const MovieForm = z.object({
  primaryTitle: z.string().min(1),
  originalTitle: z.string().optional(),
  brief: z.string().optional(),
  imageUrl: z.string().url().optional(),
  runtimeMinutes: z.number().optional(),
  releaseDate: RelaxedDate.optional(),
  endDate: RelaxedDate.optional(),
  contentRating: z.string().optional(),
  genre: z.string().array().default([]),
  keywords: z.string().array().default([]),
});

export const MovieMutationForm = MovieForm.transform((form) => ({
  ...form,
  originalTitle: form.originalTitle ?? form.primaryTitle,
}));

const MAX_FILE_SIZE = 65_000_000;
const ACCEPTED_IMAGE_TYPE = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const ImageFileUploadSchema = z.object({
  size: z.number(),
  type: z.string(),
})
  .refine((files) => files !== undefined, "image is required")
  .refine((files) => files?.size <= MAX_FILE_SIZE, "max file size is 65 MB")
  .refine((files) => ACCEPTED_IMAGE_TYPE.includes(files?.type),
    `Only accept ${ACCEPTED_IMAGE_TYPE.join(", ")}`);

const MovieImageFileUpload = z.object({
  imageUpload: z.union([ImageFileUploadSchema, z.undefined()]),
  imageNamespace: z.string().default("movies")
})
const MovieZormForm = MovieForm.merge(MovieImageFileUpload);

export const _test_private = {
  MovieZormForm,
  MovieImageFileUpload
};

const _MovieForm: React.FC<{
  visible: boolean,
  setVisible: (v: boolean) => unknown,
  movieId?: string
}> = ({ visible, setVisible, movieId }) => {
  const utils = trpc.useContext();
  const upsertMovie = trpc.movie.upsert.useMutation({
    onSuccess(data, variables) {
      utils.movie.get.invalidate({ movieId: data.id })
      utils.movie.publicFeed.invalidate()
    }
  });
  const _visible = visible;
  const movie = trpc.movie.get.useQuery({ movieId: movieId as string }, { enabled: !!movieId });
  const imageUpload = trpc.upload.user.reportUpload.useMutation();
  const zorm = useZorm("movie form", MovieZormForm, {
    onValidSubmit(e) {
      e.preventDefault();
      const { data } = e;
      console.log("Ok", data)
      upsertMovie.mutate({
        movieId: movieId,
        updateForm: data
      });
      if (data.imageUpload) {
        FreeImageHost.fetch({
          method: "POST",
          input: {
            key: clientEnv.NEXT_PUBLIC_FREEIMAGE_HOST_API,
            source: data.imageUpload
          }
        }).then(async (ret) => {
          return await imageUpload.mutateAsync({
            imageUrl: ret.image.url,
            imageDisplayName: ret.image.name,
            namespace: data.imageNamespace
          })
        });
      }
    },
  });

  const ErrorMessage: React.FC<{ message: string }> = ({ message }) => {
    return <span className="text-red-400">{message}</span>
  }

  const defaultValues = movie.data;

  const form_cva = cva([
    "w-screen", "h-screen", "absolute", "top-1/2", "left-1/2",
    "-translate-x-1/2", "-translate-y-1/2", "flex",
  ], {
    variants: {
      visibility: {
        visible: [],
        hidden: ["hidden"]
      }
    },
    defaultVariants: {
      visibility: "hidden"
    }
  })

  const [uploadByUrl, setUploadByUrl] = useState(false);
  return <form ref={zorm.ref} 
    className={form_cva({ visibility: (_visible ? "visible" : "hidden") })}>
    <div className="z-20 w-full h-full bg-black/30 flex items-center justify-center">
      <div className="relative p-4 gap-2 bg-white flex flex-col items-start rounded-md">

        <div className="group absolute top-1 right-1 text-center hover:cursor-pointer w-6 h-6 bg-red-200"
          onClick={() => { setVisible(false) }}>
          <span className="text-white font-semibold">X</span>
        </div>

        <div className="flex flex-col rounded-md">
          <label htmlFor={zorm.fields.primaryTitle()}>Primary title</label>
          <input className={cva_input_text({ hasError: zorm.errors.primaryTitle("errored") })}
            name={zorm.fields.primaryTitle()} defaultValue={defaultValues?.primaryTitle} />
          {zorm.errors.primaryTitle(e => <ErrorMessage message={e.message} />)}
        </div>

        <div className="flex flex-col rounded-md">
          <label htmlFor={zorm.fields.originalTitle()}>Original title</label>
          <input className={cva_input_text({ hasError: zorm.errors.originalTitle("errored") })}
            name={zorm.fields.originalTitle()} defaultValue={defaultValues?.originalTitle} />
          {zorm.errors.originalTitle(e => <ErrorMessage message={e.message} />)}
        </div>

        <div className="flex flex-col rounded-md">
          <label htmlFor={zorm.fields.brief()}>Brief</label>
          <textarea className={cva_input_text({ hasError: zorm.errors.brief("errored") })}
            name={zorm.fields.brief()} defaultValue={defaultValues?.brief ?? undefined} />
          {zorm.errors.brief(e => <ErrorMessage message={e.message} />)}
        </div>

        <div className="flex flex-col rounded-md">
          <label htmlFor={zorm.fields.releaseDate()}>Release date</label>
          <input type="date" className={cva_input_text({ hasError: zorm.errors.releaseDate("errored") })}
            name={zorm.fields.releaseDate()} defaultValue={defaultValues?.releaseDate?.toDateString() ?? undefined} />
          {zorm.errors.releaseDate(e => <ErrorMessage message={e.message} />)}
        </div>

        <fieldset className="flex flex-col rounded-md border p-2 gap-4">
          <legend>Poster image</legend>
          <div className="flex flex-row gap-2">
            <label>Upload from URL</label>
            <input type="checkbox" checked={uploadByUrl} onChange={() => setUploadByUrl(!uploadByUrl)} />
          </div>

          <div className={"flex flex-col"+(uploadByUrl? " hidden": "")}>
            <input type="file" name={zorm.fields.imageUpload("name")}
              className={cva_input_text({
                hasError: zorm.errors.imageUpload("errored")
              })}
            />
            {zorm.errors.imageUpload(e => <ErrorMessage message={e.message} />)}
          </div>
          <div className={""+(uploadByUrl? "": " hidden")}>
            <input name={zorm.fields.imageUrl()}
              className={cva_input_text({
                hasError: zorm.errors.imageUrl("errored")
              })}
            />
            {zorm.errors.imageUrl(e => <ErrorMessage message={e.message} />)}
          </div>
        </fieldset>

        <input className="px-2 py-1 rounded-md border hover:cursor-pointer" type="submit" />
      </div>
    </div>

  </form>

}

export const ReviewForm = z.object({
  positivity: z.enum(["upvote", "neutral", "downvote"]).default("upvote"),
  details: z.string(),
})
const _ReviewForm: React.FC<{ userId: string, review?: string }> = ({ userId, review }) => {
  return <form>

  </form>
}

const Home: NextPage = () => {
  // const [nextCursor, setNextCursor] = useState<Date|undefined>(undefined);
  const infMoviesQuery = trpc.movie.publicFeed.useInfiniteQuery(
    {
      take: 10
    }, {
    getNextPageParam: (data) => {
      // setNextCursor(data.nextCursor);
      const retval = data.hasNext ? data.nextCursor : undefined;
      console.log("next cursor:", data.nextCursor);
      console.log("has next:", data.hasNext);
      console.log("retval:", retval);
      return retval
    }
  });
  // TODO: Why a useState here instead of direct derivative of useInfiniteQuery?
  // I think I know why. We're caching some value so that the page doesn't fully
  // reload whenever a new movie is added
  const [movieTitles, setMovieTitles] = useState(() => {
    const movies = infMoviesQuery.data?.pages.map(page => page.data).flat();
    return movies;
  });
  const {
    isFetching,
    isFetchingNextPage: moviesFetchingNext,
    fetchNextPage: moviesFetchNext,
    hasNextPage
  } = infMoviesQuery;

  type Movies = NonNullable<typeof movieTitles>[number];

  const addTitles = useCallback((incoming?: Movies[]) => {
    setMovieTitles((current) => {
      // dedup current and incoming by its ID
      const titles: Record<Movies['id'], Movies> = {};
      for (const title of current ?? []) {
        titles[title.id] = title;
      }
      for (const title of incoming ?? []) {
        titles[title.id] = title;
      }
      return Object.values(titles).sort((lhs, rhs) => lhs.cursor.getTime() - rhs.cursor.getTime()).reverse();
    })
  }, [])

  useEffect(() => {
    const msgs = infMoviesQuery.data?.pages.map(page => page.data).flat();
    addTitles(msgs);
  }, [infMoviesQuery.data?.pages, addTitles])

  const MovieCard: React.FC<{ movie: Movies }> = ({ movie }) => {
    return <div className="group flex flex-col justify-center items-center gap-y-2 w-[135px] hover:cursor-pointer">
      <div className="h-[240px] w-[135px] border">
        <Image height={240} width={135}
          src={movie.imageUrl ?? "/assets/default_poster.svg"}
          alt="poster" />
      </div>
      <span className="text-md group-hover:text-lg duration-200 h-14 items-center flex text-center">
        {movie.primaryTitle} {`${!movie.releaseDate ? "" :
          `(${movie.releaseDate.getFullYear()})`}`}
      </span>
    </div>
  }
  const Movies = () => false
    ? <div>Loading...</div>
    : (!movieTitles || movieTitles.length == 0) ?
      <div>No movie titles available</div>
      : <div className="flex flex-wrap justify-center items-center p-2 gap-y-4 gap-x-12 mx-auto">
        {movieTitles.map(title => <MovieCard key={`movie-${title.id}`} movie={title}></MovieCard>)}
      </div>

  const [movieFormVisible, setMovieFormVisible] = useState(false);

  const Actions = <>
    <SearchBar />
  </>

  return <MelonBackground>
    <NavbarLayout actions={Actions}>
      <div className="flex-grow w-full h-full flex items-center">
        <div className="w-full max-w-screen-xl mx-auto">
          <div className="bg-white flex flex-col justify-center items-center">
            {/*admin tool*/}
            <div className="h-32 w-full">
              <button className="px-2 py-1 rounded-md border hover:bg-gray-200 hover:cursor-pointer"
                onClick={() => setMovieFormVisible(true)}>
                Add a movie
              </button>
            </div>
            <div className="flex flex-col justify-center items-center gap-4">
              <Movies />
              <button className="rounded-md px-2 py-1 disabled:opacity-25 border bg-pink-200"
                onClick={() => moviesFetchNext()}
                disabled={!hasNextPage || moviesFetchingNext}>
                {!hasNextPage ? "No more" : moviesFetchingNext ? "Fetching" : "Load more"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </NavbarLayout>
    <_MovieForm visible={movieFormVisible} setVisible={setMovieFormVisible} />
  </MelonBackground>
}

export default Home;
