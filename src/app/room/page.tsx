"use client"
import React, { useEffect, useState } from "react"
import { socket } from "../../socket"
import Link from "next/link"

const Page = () => {
  const [groupRooms, setGroupRooms] = useState<IGroupRoom[]>([])
  const [roomName, setRoomName] = useState("")
  useEffect(() => {
    if (socket.connected) {
      socket.emit("group-list")

      socket.on("group-list", (groupRooms) => {
        setGroupRooms(groupRooms)
      })
    }

    return () => {
      socket.off("group-list")
    }
  }, [])

  const handleNewGroupRoom = () => {
    if (roomName) {
      socket.emit("group-create", { name: roomName })
    }
  }

  return (
    <div className="p-10">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Type here"
          className="input input-bordered w-full max-w-xs"
          onChange={(e) => setRoomName(e.currentTarget.value)}
          value={roomName}
        />
        <div className="btn btn-primary" onClick={handleNewGroupRoom}>
          Add Room
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="table">
          {/* head */}
          <thead>
            <tr>
              <th></th>
              <th>ID</th>
              <th>Group Name</th>
              <th>Members Count</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {groupRooms.map((item, key) => {
              return (
                <tr key={key}>
                  <th>{key}</th>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>{item.clients?.length}</td>
                  <td>
                    <Link href={`/room/${item.id}`} className="btn btn-ghost">
                      {/* <i className="fa-solid fa-play text-green-400"></i> */}
                      <i className="fa-brands fa-google-play text-green-400"></i>
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Page
