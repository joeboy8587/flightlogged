import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";

const crumbs = [
  { label: "Home", href: "/" },
  { label: "Toolkit", href: "/toolkit" },
  { label: "FOIA / CPRA Builder" },
];

export const Route = createFileRoute("/toolkit/foia")({
  head: () => ({
    meta: [
      { title: "FOIA / CPRA Request Builder — Watchtower Toolkit" },
      { name: "description", content: "Generate a formatted, legally-cited FOIA or CPRA public records request in five minutes. Free, runs entirely in your browser." },
      { property: "og:title", content: "FOIA / CPRA Request Builder" },
      { property: "og:description", content: "Five minutes to a ready-to-send public records request." },
      { property: "og:url", content: "https://flightlogged.lovable.app/toolkit/foia" },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/toolkit/foia" }],
    scripts: [breadcrumbScript(crumbs)],
  }),
  component: FoiaBuilder,
});

type RequestType = "federal-foia" | "ca-cpra" | "faa" | "local";

const AGENCIES: Record<RequestType, { value: string; label: string; address: string }[]> = {
  "federal-foia": [
    { value: "fbi", label: "Federal Bureau of Investigation (FBI)", address: "FBI Record/Information Dissemination Section\n170 Marcel Drive\nWinchester, VA 22602-4843" },
    { value: "dhs", label: "Department of Homeland Security (DHS)", address: "Privacy Office, Mail Stop 0655\nDepartment of Homeland Security\n2707 Martin Luther King Jr. Ave SE\nWashington, DC 20528-0655" },
    { value: "doj", label: "Department of Justice (DOJ)", address: "Office of Information Policy\nDepartment of Justice\n441 G Street NW, 6th Floor\nWashington, DC 20530" },
  ],
  "faa": [
    { value: "faa-hq", label: "FAA — Headquarters FOIA Office", address: "Federal Aviation Administration\nFOIA Requester Service Center, AGC-300\n800 Independence Avenue SW\nWashington, DC 20591" },
    { value: "faa-flight-standards", label: "FAA — Flight Standards Service", address: "FAA Flight Standards Service\nAFS-1, 800 Independence Avenue SW\nWashington, DC 20591" },
  ],
  "ca-cpra": [
    { value: "kcso", label: "Kern County Sheriff's Office", address: "Kern County Sheriff's Office\nRecords Bureau\n1350 Norris Road\nBakersfield, CA 93308" },
    { value: "lapd", label: "Los Angeles Police Department", address: "LAPD Discovery Section\nP.O. Box 30158\nLos Angeles, CA 90030" },
    { value: "lasd", label: "Los Angeles County Sheriff's Department", address: "LASD Office of Constitutional Policing\n4700 Ramona Boulevard\nMonterey Park, CA 91754" },
    { value: "ca-chp", label: "California Highway Patrol", address: "California Highway Patrol\nP.O. Box 942898