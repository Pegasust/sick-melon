// Implementation of navbar

import type { ReactNode } from "react";
import Image from "next/image";
import { signIn, signOut, useSession } from "next-auth/react";
import { SearchBar } from "./search_bar";

export const NavbarLayout: React.FC<{ actions?: ReactNode, children?: ReactNode }> = ({ actions, children }) => {
    const session = useSession();
    const user = session.data?.user;
    const loggedIn = !!user;

    const LoginBar = () => <div>
        {!loggedIn
            ? <button onClick={() => { signIn() }}>Sign in</button>
            : <div className="flex items-center gap-2">
                <div className="w-fit h-fit group flex items-center">
                    <div className="rounded-md">
                        <Image className="rounded-md"
                            src={user.image ?? "/assets/loading_avatar.svg"}
                            alt="avatar" width={32} height={32} />
                    </div>
                </div>
                <button className="border rounded-md py-1 px-2 hover:cursor-pointer
                        hover:bg-gray-200"
                    onClick={() => { signOut() }}>Sign out</button>
            </div>}
    </div>
    const Navbar = () => <div className="w-full mx-auto flex flex-row h-12 border align-middle
        justify-between sticky top-0 z-10 bg-white">
        <div className="flex-grow w-full h-full flex items-center">
            <div className="w-full max-w-screen-xl mx-auto flex justify-between items-center gap-4">
                {/*logo*/}
                <div className="flex">
                    <div className="m-2 flex self-center flex-row align-middle">
                        {/*logo image*/}
                        <Image src="/assets/watermelon.svg" alt="logo" height={32} width={32} />
                    </div>
                    <h1 className="self-center text-center text-2xl leading-normal
                font-semibold hover:cursor-pointer">
                        Sick Melon
                    </h1>
                </div>

                {actions}
                <LoginBar />
            </div>
        </div>
    </div>;

    return <div className="items-stretch min-h-screen mx-auto flex flex-col">
        <Navbar />
        {children}
    </div>
}
