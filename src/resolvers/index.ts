import { getActoresCollection, getPeliculasCollection } from "../config/db";
import { ObjectId, type Collection } from "mongodb";
import type { CastPatchT, CastT, FilmPatchT, FilmT } from "../models/types";

const checkActoresExisten = async(actores: ObjectId[]) => {
    const collection = getActoresCollection();
    const actoresQueExisten = await collection.find({_id: { $in: actores}}).toArray();
    if(actoresQueExisten.length !== actores.length){
        throw new Error("Algunos actores no existen")
    }
}

export const resolvers = {
    Query:{
        peliculas: async () => {
            const collection = getPeliculasCollection();

            return await collection.find().toArray();
        },
        pelicula: (_: unknown, args: { id: string}) => {
            const id = new ObjectId(args.id);
            const collection = getPeliculasCollection();
            return collection.findOne({ _id: id });
        },
        peliculasPorDirector: (_:unknown, args: { director: string}) => {
            const { director } = args;
            const collection = getPeliculasCollection();
            return collection.find({ director }).toArray();
        },
        actores: async ()=> {
            const collection = getActoresCollection();
            return await collection.find().toArray();
        },
        actor: async (_:unknown, args: {id: string}) => {
            const collection = getActoresCollection();
            return await collection.findOne({_id: new ObjectId(args.id)})
        }
    },
    Mutation:{
        crearPelicula: async (_:unknown, args: { input : FilmT }) => {
            const collection = getPeliculasCollection();

            const nuevaPeli:FilmT = {
                ...args.input,
                cast: args.input.cast.map(idActor => new ObjectId(idActor as string))
            }

            await checkActoresExisten(nuevaPeli.cast as ObjectId[]);

            const insertada = await collection.insertOne(nuevaPeli);

            const nuevaPeliConId = await collection.findOne({
                _id: insertada.insertedId
            });

            return nuevaPeliConId;
        },
        cambiarPelicula: async (_:unknown, args: { id: string, input: FilmPatchT}) => {
            const collection = getPeliculasCollection();
            const id = new ObjectId(args.id);
            if(args.input.cast){
                await checkActoresExisten(args.input.cast.map(idecito=>new ObjectId(idecito as string)))
            }
            return await collection.findOneAndUpdate(
                { _id: id },
                { $set: args.input.cast ? {
                    ...args.input,
                    cast: args.input.cast.map(idsito=>new ObjectId(idsito as string))
                } : args.input },
                { returnDocument: "after" }
            );
        },
        eliminarPelicula: (_:unknown, args: {id: string}) => {
            const collection = getPeliculasCollection();
            const id = new ObjectId(args.id);
            return collection.findOneAndDelete({ _id: id });
        },
        crearActor: async (_:unknown, args: {input: CastT}) => {
            const collection = getActoresCollection();
            const insertado = await collection.insertOne(args.input);
            return await collection.findOne({_id: insertado.insertedId});
        },
        cambiarActor: async (_:unknown, args: { id: string, input: CastPatchT}) => {
            const collection = getActoresCollection();

            return await collection.findOneAndUpdate(
                {_id: new ObjectId(args.id)},
                { $set: args.input},
                { returnDocument: "after"}
            )
        },
        eliminarActor: async (_:unknown, args: {id: string}) => {
            const collection = getActoresCollection();
            return await collection.findOneAndDelete({_id: new ObjectId(args.id)})
        }
    },
    Pelicula: {
        cast: async (parent: FilmT) => {
            const collection = getActoresCollection();

            const actores = await collection.find({ _id: { $in: parent.cast as ObjectId[]}}).toArray();
            return actores;
        }
    }
};