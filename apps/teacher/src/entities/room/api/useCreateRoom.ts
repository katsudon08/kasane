import { useMutation } from "@tanstack/react-query";

import { api } from "../../../shared/api";

export function useCreateRoom() {
	return useMutation({
		mutationFn: async () => {
			const { data, error } = await api.rooms.create.post();
			if (error) throw error;
			return data;
		},
	});
}
