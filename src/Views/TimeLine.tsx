
import { TFile, moment, PaneType } from "obsidian";
import * as  React from "react";
import { useCallback } from "react";
import { getChronologySettings } from "src/main";
import { groupBy, range } from "src/utils";

import { CalendarItem, CalendarItemType } from "../CalendarType";
import { DateAttribute, NoteAttributes } from "../TimeIndex";
import { NoteView } from "./NoteView";


export const Badge = ({ attribute, time }: { attribute: DateAttribute, time: moment.Moment }) => {


    if (attribute === DateAttribute.Created) {

        return <div className="chrono-badge chrono-created" title="Created"  ></div>
    } else {
        return <div className="chrono-badge chrono-modified" title="Modified" ></div>

    }
}

export const ExpandableNoteList = ({ items, onOpen }: {
    items: NoteAttributes[],
    onOpen: (note: TFile, paneType: PaneType | boolean) => void
}) => {

    // TODO: configure
    const startExpanded = !getChronologySettings().groupItemsInSameSlot;

    const [expanded, setExpanded] = React.useState(startExpanded)

    const onExpand = useCallback(() => {
        setExpanded(true);
    }, [setExpanded])

    if (items && items.length > 1 && !expanded) {
        return (
            <div className="chrono-cluster-container">
                <div className="chrono-temp-note" title="Click To Expand" onClick={onExpand}>
                    <span className="chrono-note-time">{moment(items.first()!.time).format("LT")}</span>-
                    <span className="chrono-note-time">{moment(items.last()!.time).format("LT")}</span>
                    <span className="chrono-notes-count">
                        {items.length}
                    </span>
                    <span className="chrono-notes-notes">
                        Elements
                    </span>
                    <span className="chrono-notes-ellipsis">...</span>
                </div>
            </div>
        );
    }
    if (!items || items.length === 0) {
        return null; // or return an empty fragment: <></>
    }
    return (
        <div className="chrono-cluster-container">
            {items && items.map(item =>
                <NoteView key={item.note.path + item.attribute} item={item} onOpen={onOpen} extraInfo={true} />
            )}
        </div>
    );
}


/**
 * Retrieves the clustering strategy based on the calendar item type.
 * 
 * This function defines different clustering strategies for different calendar item types.
 * Each strategy includes:
 * - `slots`: An array representing the time slots or days.
 * - `clusters`: An array representing the cluster intervals.
 * - `slotFn`: A function to determine the slot for a given note.
 * - `clusterFn`: A function to determine the cluster for a given note.
 * 
 * @returns {Object} An object containing clustering strategies for each calendar item type.
 */
function getClusteringStrategy() {
    const clusteringStrategies = {
        [CalendarItemType.Day]: {
            slots: range(0, 23).map(n => moment().hour(n).format(getChronologySettings().use24Hours ? "HH" : "hh A")),
            clusters: range(0, 2).map(s => (s * 10).toString()),
            slotFn: (item: NoteAttributes) => moment(item.time).format(getChronologySettings().use24Hours ? "HH" : "hh A"),
            clusterFn: (item: NoteAttributes) => (Math.floor(moment(item.time).minutes() / 10) * 10).toString()
        },
        [CalendarItemType.Week]: {
            slots: moment.weekdaysShort(true),
            clusters: range(0, 5).reverse().map(s => (s * 4).toString()),
            slotFn: (item: NoteAttributes) => moment.weekdaysShort()[moment(item.time).day()],
            clusterFn: (item: NoteAttributes) => (Math.floor(moment(item.time).hours() / 4) * 4).toString()
        },
        [CalendarItemType.Month]: undefined,
        [CalendarItemType.Year]: undefined,
    };

    return clusteringStrategies;
}



/**
 * TimeLine component renders a timeline visualization of notes.
 * 
 * @param {Object} props - The component props.
 * @param {CalendarItem} props.calItem - The calendar item to determine the type of timeline.
 * @param {NoteAttributes[]} props.items - The list of note attributes to be displayed.
 * @param {Function} props.onOpen - Callback function to handle opening a note.
 * 
 * @returns {JSX.Element} A JSX element representing the timeline.
 */
export const TimeLine = ({ calItem, items, onOpen }:
    {
        calItem: CalendarItem,
        items: NoteAttributes[],
        onOpen: (note: TFile, paneType: PaneType | boolean) => void
    }) => {

    if(calItem.type == CalendarItemType.Range) return (<div></div>);    
    
    const clusterStrat = getClusteringStrategy()[calItem.type];
    if(!clusterStrat){
        return (
            <div></div>
        );
    }

    const slotsWithData = clusterize(items,
        clusterStrat.slots,
        clusterStrat.slotFn,
        clusterStrat.clusters,
        clusterStrat.clusterFn
    );

    return (
        <div className="chronology-timeline-container">
            {slotsWithData.map(({ slot, clusters }, slotNmber) =>
                <div key={slot} className="chrono-temp-slot1">


                    <div className="chrono-temp-slot1-info">
                        <div className="chrono-temp-slot1-name">{slot}</div>
                    </div>
                    <div className="chrono-temp-slot1-content">
                        {clusters.map(
                            ({ cluster, items }) =>
                                <ExpandableNoteList key={cluster} items={items} onOpen={onOpen} />
                        )}
                    </div>


                </div>
            )}
        </div>
    );
}


function clusterize(items: NoteAttributes[],
    slots: string[],
    slotByFn: (item: NoteAttributes) => string,
    clusters: string[],
    clusterByFn: (item: NoteAttributes) => string
) {


    // groups items in slot of slotSize

    const groupedBy = groupBy(items, slotByFn);

    let slotsWithData = slots.map(slot => ({
        slot,
        items: groupedBy[slot]
    }));
    const first = slotsWithData.findIndex(item => item.items);
    const last = slotsWithData.length - slotsWithData.reverse().findIndex(item => item.items) - 1;
    slotsWithData.reverse();

    if(first>=0){
        slotsWithData = slotsWithData.slice(first, last + 1);
    } else {
        slotsWithData = [];
    }


    const slotAndClusters = slotsWithData.map(slot => {
        const items = slot.items || [];
        const clusterBy = groupBy(items, clusterByFn);

        const clusterList = clusters.map(clName => (
            {
                cluster: clName,
                items: clusterBy[clName]
            })
        );

        return ({
            slot: slot.slot,
            clusters: clusterList
        })
    })

    return slotAndClusters;
}

