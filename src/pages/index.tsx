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
    }
  },
  defaultVariants: {
    intent: "primary",
    size: "medium",
    isRequired: "not",
    hasError: "none"
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
}).transform((form) => ({
  ...form,
  originalTitle: form.originalTitle ?? form.primaryTitle,
}));

const _MovieFormZormless: React.FC<{ visible?: boolean, movieId?: string }> = ({ visible, movieId }) => {
  const utils = trpc.useContext();
  const upsertMovie = trpc.movie.upsert.useMutation({
    onSuccess(data, variables) {
      utils.movie.get.invalidate({ movieId: data.id });
      // TODO: Since we use the cursor as the last element, need to store
      // the cursor and invalidate it here
      utils.movie.publicFeed.invalidate()
      console.log("invalidated")
    }
  });
  const _visible = visible ?? true;
  const movie = trpc.movie.get.useQuery({ movieId: movieId as string }, { enabled: !!movieId });

  const _handler: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    // unpack form data (all strings I believe)
    const formData = new FormData(e.currentTarget);
    const rawFormStruct: Record<string, FormDataEntryValue> = {}
    for (const [key, value] of formData) {
      // TODO: What happens if this is a file?
      rawFormStruct[key] = value;
    }
    console.log("raw form:", rawFormStruct);

    // perform validation
    const formStruct = MovieForm.safeParse(rawFormStruct);
    if (!formStruct.success) {
      // unpack error somehow
      console.error("Error validating submitted form", formStruct.error.toString())
      // TODO: mark the errors from here formStruct.error.formErrors.fieldErrors.
      return false;
    }
    console.log("Ok on parsing", formStruct.data);
    const trpcValidate = MovieForm.safeParse(formStruct.data);
    if (!trpcValidate.success) {
      console.error("MovieForm not idempotent, unfit to pass to tRPC", trpcValidate.error.toString());
      return false;
    }
    console.log("Ok after validation");
    upsertMovie.mutate({
      movieId: movieId,
      updateForm: formStruct.data
    })
    return false;
  }
  return <form onSubmit={_handler} className={_visible ? "" : " hidden"}>

    <div>
      <label>Primary title</label>
      <input name="primaryTitle" />
    </div>

    <div>
      <label>Original title</label>
      <input name="originalTitle" />
    </div>

    <div>
      <label>Brief</label>
      <textarea name="brief" />
    </div>

    <div>
      <label>Release date</label>
      <input type="date" name="releaseDate" />
    </div>

    <div>
      <label>End date</label>
      <input type="date" name="endDate" />
    </div>
    <input type="submit" />


  </form>
}

const _MovieForm: React.FC<{ visible?: boolean, movieId?: string }> = ({ visible, movieId }) => {
  const utils = trpc.useContext();
  const upsertMovie = trpc.movie.upsert.useMutation({
    onSuccess(data, variables) {
      utils.movie.get.invalidate({ movieId: data.id })
    }
  });
  const _visible = visible ?? true;
  const movie = trpc.movie.get.useQuery({ movieId: movieId as string }, { enabled: !!movieId });
  const zorm = useZorm("movie form", MovieForm, {
    onValidSubmit(e) {
      e.preventDefault();
      const { data } = e;
      console.log("Ok", data)
      upsertMovie.mutate({
        movieId: movieId,
        updateForm: data
      });
    },
  });

  const ErrorMessage: React.FC<{ message: string }> = ({ message }) => {
    return <span className="text-red-400">{message}</span>
  }

  return <form ref={zorm.ref}
    className={"w-screen h-screen absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex border rounded-md" +
      (_visible ? "" : " hidden")}>
    <div className="z-20 w-full h-full bg-black/30 flex items-center justify-center">
      <div className="p-4 bg-white flex flex-col items-start">

        <div className="flex flex-col rounded-md">
          <label htmlFor={zorm.fields.primaryTitle()}>Primary title</label>
          <input className={cva_input_text({ hasError: zorm.errors.primaryTitle("errored") })}
            name={zorm.fields.primaryTitle()} />
          {zorm.errors.primaryTitle(e => <ErrorMessage message={e.message} />)}
        </div>

        <div className="flex flex-col rounded-md">
          <label htmlFor={zorm.fields.originalTitle()}>Original title</label>
          <input className={cva_input_text({ hasError: zorm.errors.originalTitle("errored") })}
            name={zorm.fields.originalTitle()} />
          {zorm.errors.originalTitle(e => <ErrorMessage message={e.message} />)}
        </div>

        <div className="flex flex-col rounded-md">
          <label htmlFor={zorm.fields.brief()}>Brief</label>
          <textarea className={cva_input_text({ hasError: zorm.errors.brief("errored") })}
            name={zorm.fields.brief()} />
          {zorm.errors.brief(e => <ErrorMessage message={e.message} />)}
        </div>

        {/*Why this does not work?*/}
        <div className="flex flex-col rounded-md">
          <label htmlFor={zorm.fields.releaseDate()}>Release date</label>
          <input type="date" className={cva_input_text({ hasError: zorm.errors.releaseDate("errored") })}
            name={zorm.fields.releaseDate()} />
          {zorm.errors.releaseDate(e => <ErrorMessage message={e.message} />)}
        </div>

        <input className="mx-auto px-2 py-1 rounded-md border hover:cursor-pointer" type="submit" />
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
          movie.releaseDate.getFullYear()}`}
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
    <button className="px-2 py-1 rounded-md border hover:bg-gray-200 hover:cursor-pointer"
      onClick={() => setMovieFormVisible(true)}>
      Add a movie
    </button>
  </>

  return <MelonBackground>
    <NavbarLayout actions={Actions}>
      <div className="flex-grow w-full h-full flex items-center">
        <div className="w-full max-w-screen-xl mx-auto">
          <div className="bg-white flex flex-col justify-center items-center gap-4">
            <Movies />
            <button className="rounded-md px-2 py-1 disabled:opacity-25 border bg-pink-200"
              onClick={() => moviesFetchNext()}
              disabled={!hasNextPage || moviesFetchingNext}>
              {!hasNextPage ? "No more" : moviesFetchingNext? "Fetching": "Load more"}
            </button>
          </div>
        </div>
      </div>
    </NavbarLayout>
    <_MovieFormZormless visible={movieFormVisible} />
  </MelonBackground>
}

export default Home;
