import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { signIn, signOut, useSession } from "next-auth/react";

import { trpc } from "@utils/trpc";
import { NavbarLayout } from "@components/navbar";
import { ReactElement, ReactNode, useCallback, useEffect, useState } from "react";
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
  z.string().transform((e) => new Date(e)),
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
  genre: z.string().array(),
  keywords: z.string().array(),
}).transform((form) => ({
  ...form,
  originalTitle: form.originalTitle ?? form.primaryTitle,
}));

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
      // doesn't get submitted for some reason
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

  type Chain = typeof zorm.fields.primaryTitle;
  type ErrorChain = typeof zorm.errors.primaryTitle;
  // This is cursed for some reason, looks like when the form is first submitted,
  // if there is any re-render, then fields get cleared instead of persisting
  const InputField: React.FC<{
    name: Chain,
    err: ErrorChain,
    display: string,
    className?: string,
    type?: string,
  }> = ({ type, name, err, display, className }) => <div className={className}>
    <label htmlFor={name()}>{display}</label>
    <input type={type} className={cva_input_text({ hasError: err("errored") })}
      name={name()} />
    {err(((e: {message: string}) => <ErrorMessage message={e.message} />))}
  </div>
  return <form ref={zorm.ref}
    className={"w-screen h-screen absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex border rounded-md" +
      (_visible ? "" : " hidden")}>
    <div className="z-20 w-full h-full bg-black/30 flex items-center justify-center">
      <div className="p-4 bg-white flex flex-col items-start">

        <InputField name={zorm.fields.primaryTitle} err={zorm.errors.primaryTitle}
          display="Primary title" className="flex flex-col"/>

        <InputField name={zorm.fields.originalTitle} err={zorm.errors.originalTitle}
          display="Original title" className = "flex flex-col"/>

        <div className="flex flex-col rounded-md">
          <label htmlFor={zorm.fields.brief()}>Brief</label>
          <textarea className={cva_input_text({ hasError: zorm.errors.brief("errored") })}
            name={zorm.fields.brief()} />
          {zorm.errors.brief(e => <ErrorMessage message={e.message} />)}
        </div>

        {/*Why this does not work?*/}
        <InputField type="date" name={zorm.fields.releaseDate} err={zorm.errors.releaseDate}
          display="Release date" className = "flex flex-col"/>
        <InputField type="date" name={zorm.fields.endDate} err={zorm.errors.endDate}
          display="End date" className = "flex flex-col"/>
        <InputField name={zorm.fields.contentRating} err={zorm.errors.contentRating}
          display="Content rating" className = "flex flex-col"/>

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
  const infMoviesQuery = trpc.movie.publicFeed.useInfiniteQuery(
    {}, {
    getNextPageParam: (data) => data.nextCursor,
  });
  // TODO: Why a useState here instead of direct derivative of useInfiniteQuery?
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
      return Object.values(titles).sort((lhs, rhs) => lhs.cursor.getTime() - rhs.cursor.getTime())
    })
  }, [])

  useEffect(() => {
    const msgs = infMoviesQuery.data?.pages.map(page => page.data).flat();
    addTitles(msgs);
  }, [infMoviesQuery.data?.pages, addTitles])

  const MovieCard: React.FC<{ movie: Movies }> = ({ movie }) => {
    return <div className="group flex flex-col justify-center items-center">
      <div className="w-[480px] h-[270px]">
        <Image height={480} width={270}
          src={movie.imageUrl ?? "public/assets/default_poster.svg"}
          alt="poster" />
      </div>
      <span className="text-md group-hover:text-lg duration-200">{movie.primaryTitle} {`${!movie.releaseDate ? "" :
        movie.releaseDate.getFullYear()}`}</span>
    </div>
  }
  const Movies = () => isFetching || !movieTitles
    ? <div>Loading...</div>
    : <div className="flex flex-wrap justify-between items-center p-2">
      {movieTitles.map(title => <MovieCard key={`movie-${title.id}`} movie={title}></MovieCard>)}
      <button className="rounded-md px-2 py-1 disabled:opacity-25 border bg-pink-200"
        onClick={() => moviesFetchNext()}
        disabled={hasNextPage || moviesFetchingNext}>
        {hasNextPage ? "Load more" : moviesFetchingNext ? "Loading..." : "No more"}
      </button>
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
          <div className="bg-white">
            <Movies />
          </div>
        </div>
      </div>
    </NavbarLayout>
    <_MovieForm visible={movieFormVisible} />
  </MelonBackground>
}

export default Home;
