import { Elysia, t } from "elysia";

import type { CreateRoom } from "../../application/usecases/create-room";

type RoomsControllerDeps = {
	createRoom: CreateRoom;
};

export const roomsController = ({ createRoom }: RoomsControllerDeps) =>
	new Elysia({ prefix: "/rooms" }).post(
		"/create",
		async () => {
			const { id } = await createRoom();
			return { id };
		},
		{
			response: t.Object({ id: t.String() }),
		},
	);
