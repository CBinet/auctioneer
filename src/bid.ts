import { Snowflake } from 'discord.js';

export class Bid {
    public bidder: Snowflake;
    public amount: number;
    public date: Date;
}