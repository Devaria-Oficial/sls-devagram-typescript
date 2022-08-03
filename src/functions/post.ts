import { validateEnvs } from '../utils/environmentsUtils';
import { imageExtensionsAllowed } from '../constants/Regexes';
import { S3Service } from '../services/S3Services';
import { UserModel } from '../models/UserModel';
import { getUserIdFromEvent } from '../utils/authenticationHandlerUtils';
import { APIGatewayEvent, Handler } from "aws-lambda";
import { DefaultJsonResponse, formatDefaultResponse } from "../utils/formatResponsUtil";
import { parse } from 'aws-multipart-parser';
import { FileData } from 'aws-multipart-parser/dist/models';
import * as Uuid from 'uuid';
import * as moment from 'moment';
import { PostModel } from '../models/PostModel';

export const create: Handler = async (event: APIGatewayEvent):
    Promise<DefaultJsonResponse> => {
    try {
        const { POST_BUCKET, error } = validateEnvs(['POST_TABLE',
            'POST_BUCKET']);
        if (error) {
            return formatDefaultResponse(500, error);
        }

        const userId = getUserIdFromEvent(event);
        if (!userId) {
            return formatDefaultResponse(400, 'Usuário não encontrado.');
        }

        const user = await UserModel.get({ 'cognitoId': userId });
        if (!user) {
            return formatDefaultResponse(400, 'Usuário não encontrado.');
        }

        const formData = parse(event, true);
        const file = formData.file as FileData;
        const description = formData.description as string;

        if (!description || description.trim().length < 5) {
            return formatDefaultResponse(400, 'Descrição inválida');
        }

        if (!file || !imageExtensionsAllowed.exec(file.filename)) {
            return formatDefaultResponse(400, 'Extensão informada do arquivo não é válida');
        }

        const imageKey = await new S3Service().saveImage(POST_BUCKET, 'post', file);

        const post = {
            id: Uuid.v4(),
            userId,
            description,
            date: moment().format(),
            image: imageKey
        };

        await PostModel.create(post);
        user.posts = user.posts + 1;
        await UserModel.update(user);
        return formatDefaultResponse(200, 'Publicação criada com sucesso!');
    } catch (error) {
        console.log('Error on create post:', error);
        return formatDefaultResponse(500, 'Erro ao criar publicação! Tente novamente ou contacte o administrador do sistema.');
    }
}

export const toggleLike: Handler = async (event: any):
    Promise<DefaultJsonResponse> => {
    try {
        const { error } = validateEnvs(['POST_TABLE']);
        if (error) {
            return formatDefaultResponse(500, error);
        }

        const userId = getUserIdFromEvent(event);
        if (!userId) {
            return formatDefaultResponse(400, 'Usuário não encontrado.');
        }

        const user = await UserModel.get({ 'cognitoId': userId });
        if (!user) {
            return formatDefaultResponse(400, 'Usuário não encontrado.');
        }

        const { postId } = event.pathParameters;
        const post = await PostModel.get({ id: postId });
        if (!post) {
            return formatDefaultResponse(400, 'Publicação não encontrada.');
        }

        const hasLikedIndex = post.likes.findIndex((obj: any) => {
            const result = obj.toString() === userId;
            return result;
        });

        if (hasLikedIndex != -1) {
            post.likes.splice(hasLikedIndex, 1);
            await PostModel.update(post);
            return formatDefaultResponse(200, 'Like removido com sucesso!');
        } else {
            post.likes.push(userId);
            await PostModel.update(post);
            return formatDefaultResponse(200, 'Like adicionado com sucesso!');
        }
    } catch (error) {
        console.log('Error on toggle like:', error);
        return formatDefaultResponse(500, 'Erro ao curtir/descurtir a publicação! Tente novamente ou contacte o administrador do sistema.');
    }
}

export const postComent: Handler = async (event: any): Promise<DefaultJsonResponse> => {
    try {
        const { error } = validateEnvs(['POST_TABLE']);
        if (error) {
            return formatDefaultResponse(500, error);
        }

        const userId = getUserIdFromEvent(event);
        if (!userId) {
            return formatDefaultResponse(400, 'Usuário não encontrado.');
        }

        const user = await UserModel.get({ 'cognitoId': userId });
        if (!user) {
            return formatDefaultResponse(400, 'Usuário não encontrado.');
        }

        const { postId } = event.pathParameters;
        const post = await PostModel.get({ id: postId });
        if (!post) {
            return formatDefaultResponse(400, 'Publicação não encontrada.');
        }

        const request = JSON.parse(event.body);
        const {coment } = request;

        if(!coment || coment.length < 2){
            return formatDefaultResponse(400, 'Comentário não é válido.');
        }

        const comentObj = {
            userId,
            userName: user.name,
            date: moment().format(),
            coment
        }

        post.coments.push(comentObj);
        await PostModel.update(post);
        return formatDefaultResponse(200, 'Comentário adicionado com sucesso!');
    } catch (error) {
        console.log('Error on post comment like:', error);
        return formatDefaultResponse(500, 'Erro ao comentar na publicação! Tente novamente ou contacte o administrador do sistema.');
    }
}