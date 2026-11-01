import { Elysia, t } from "elysia";

type RoomsControllerDeps = {
	createRoom: () => Promise<{ id: string }>;
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
