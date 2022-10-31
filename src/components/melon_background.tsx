import { ReactNode } from "react"

export const MelonBackground: React.FC<{ children: ReactNode }> = ({ children }) => {
    return <div className="melon-background w-full h-full">
        {children}
    </div>
}
