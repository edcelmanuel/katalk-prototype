"use client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { socket } from "../../../socket"
import dynamic from "next/dynamic"
import GroupVideoRTC from "./GroupVideoRTC"

// const GroupVideoRTC = dynamic(() => import("./GroupVideoRTC"), {
//   ssr: false,
//   loading: () => <div>Loading</div>,
// })

export default function Page({ params }: any) {
  const router = useRouter()
  const roomId = params?.roomId ?? ""

  const [groupRoom, setGroupRoom] = useState<IGroupRoom>()

  useEffect(() => {
    if (socket.connected) {
      socket.emit("group-join", { id: roomId })
      socket.on("group-join", (groupRoom) => {
        setGroupRoom(groupRoom.room)
      })

      socket.on("group-read", (groupRoom) => {
        setGroupRoom(groupRoom)
      })
    }

    return () => {
      socket.off("group-join")
    }
  }, [roomId])

  const handleGroupLeave = () => {
    socket.emit("group-leave", groupRoom)
    router.push("/room")
  }

  if (!roomId) {
    params.push("/rooms")
  }

  return (
    <div className="p-10">
      <div className="mb-4 text-2xl">
        Room ID: {groupRoom?.name ?? ""} - {groupRoom?.id ?? ""}
      </div>
      <div className="grid grid-flow-row grid-cols-3 mb-4 gap-4">
        {groupRoom?.clients?.map((item, key) => {
          return (
            <div className="card p-4 bg-base-300" key={key}>
              {item}
            </div>
          )
        })}
      </div>
      <GroupVideoRTC roomId={roomId} />

      <div className="btn btn-primary" onClick={handleGroupLeave}>
        back
      </div>
    </div>
  )
}
