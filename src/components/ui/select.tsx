import * as React from "react"
import { cn } from "@/lib/utils"

type SelectContextType = {
  items: { value: string; label: React.ReactNode }[]
  registerItem: (item: { value: string; label: React.ReactNode }) => void
}

const SelectItemsContext = React.createContext<SelectContextType | null>(null)

export function Select(props: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) {
  const [items, setItems] = React.useState<{ value: string; label: React.ReactNode }[]>([])

  // Collect items from children
  const registerItem = React.useCallback((item) => {
    setItems((prev) => {
      if (prev.find((it) => it.value === item.value)) return prev
      return [...prev, item]
    })
  }, [])

  // Render a native select using the collected items
  return (
    <SelectItemsContext.Provider value={{ items, registerItem }}>
      <div className="relative w-full">
        <select
          className={cn("w-full border rounded-xl px-2.5 py-1.5 bg-white")}
          value={props.value ?? ""}
          onChange={(e) => props.onValueChange(e.target.value)}
        >
          {items.map((it) => (
            <option key={it.value} value={it.value}>
              {typeof it.label === "string" ? it.label : (it.label as any)?.props?.children ?? it.value}
            </option>
          ))}
        </select>
        {/* Don't render children visibly; they are only used to register items */}
        <div className="hidden">{props.children}</div>
      </div>
    </SelectItemsContext.Provider>
  )
}

export function SelectTrigger({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  // Placeholder for API compatibility; not used visually
  return <div className={cn(className)}>{children}</div>
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  // Placeholder container to host SelectItem
  return <div>{children}</div>
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(SelectItemsContext)
  React.useEffect(() => {
    if (ctx) ctx.registerItem({ value, label: children })
  }, [ctx, value, children])
  return null
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  // Not needed; native select shows value
  return <span className="text-slate-500">{placeholder ?? ""}</span>
}
